// Validates MDX content — including draft lessons, which `npm run build` and
// `npm run index` skip. Writes nothing, so it is safe to run from several
// sessions at once.
//   node scripts/check-content.mjs                 # all content
//   node scripts/check-content.mjs <file.mdx> ...  # only these files (ids are still checked site-wide)
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const rel = (f) => path.relative(ROOT, f).replaceAll("\\", "/");

// ---------- what the site knows about ----------
function objectBlock(file, start) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  const from = src.indexOf(start);
  if (from < 0) throw new Error(`cannot find "${start}" in ${file}`);
  return src.slice(from, src.indexOf("};", from));
}
const mdxBlock = objectBlock("src/components/mdx.tsx", "export const mdxComponents");
const COMPONENTS = new Set([
  ...[...mdxBlock.matchAll(/^\s*([A-Za-z]\w*)\s*:/gm)].map((m) => m[1]),
  ...[...mdxBlock.matchAll(/^\s*([A-Z]\w*(?:\s*,\s*[A-Z]\w*)*)\s*,?\s*$/gm)].flatMap((m) => m[1].split(/\s*,\s*/)),
]);
const LABS = new Set(
  [...objectBlock("src/components/labs/index.tsx", "const LABS").matchAll(/^\s*(?:"([^"]+)"|(\w+))\s*:/gm)].map((m) => m[1] ?? m[2]),
);
const diagramExists = (name) => fs.existsSync(path.join(CONTENT, "diagrams", `${name}.svg`));

const TEMPLATE_LEFTOVERS = [
  "__ID__", "__TITLE__", "// code here", "سطر واحد بيقول الدرس ده عن إيه", "اسم التشبيه",
  "اشرح الفكرة بحاجة من الحياة اليومية", "اشرح أبسط كود للفكرة", "الحالات اللي بتظهر في المشاريع الحقيقية.",
  "الـ trade-offs والأخطاء الشائعة.", "السؤال، والإجابة القوية.", "السؤال الأول؟",
];

// ---------- collect files ----------
function allContentFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "_templates" && e.name !== "diagrams") walk(full); }
      else if (e.name.endsWith(".mdx")) out.push(full);
    }
  };
  walk(CONTENT);
  return out.sort();
}
const ALL = allContentFiles();
const args = process.argv.slice(2);
const targets = args.length ? args.map((a) => path.resolve(ROOT, a)) : ALL;

const errors = [];
const warnings = [];
const err = (file, line, msg) => errors.push(`${rel(file)}${line ? `:${line}` : ""}  ${msg}`);
const warn = (file, line, msg) => warnings.push(`${rel(file)}${line ? `:${line}` : ""}  ${msg}`);

function read(file) {
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const offset = raw.slice(0, raw.indexOf(content)).split("\n").length - 1;
  const lineAt = (index) => content.slice(0, index).split("\n").length + offset;
  return { raw, data, content, offset, lineAt };
}

// ---------- 1. ids unique site-wide (drafts included) ----------
const seen = new Map();
for (const file of [...new Set([...ALL, ...targets])].filter((f) => fs.existsSync(f))) {
  const { content, lineAt } = read(file);
  for (const m of content.matchAll(/<(Task|Question|LogBox) id="([^"]+)"/g)) {
    const where = `${rel(file)}:${lineAt(m.index)}`;
    if (seen.has(m[2])) err(file, lineAt(m.index), `duplicate id "${m[2]}" (${m[1]}), already used at ${seen.get(m[2])}`);
    else seen.set(m[2], where);
  }
}

// ---------- 2. per-file checks ----------
function inspect(file, offset) {
  const L = (node) => (node.position ? node.position.start.line + offset : 0);
  return () => (tree) => {
    visit(tree, (node) => {
      if (node.type === "mdxFlowExpression" || node.type === "mdxTextExpression")
        err(file, L(node), `unescaped "{${String(node.value).slice(0, 30)}}": write \\{ and \\} in prose (JS expressions are disabled)`);
      if (node.type === "mdxjsEsm") err(file, L(node), "import/export is not allowed in MDX here");
      if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return;
      if (!node.name) return err(file, L(node), "JSX fragments <></> are not allowed");
      if (/^[A-Z]/.test(node.name) && !COMPONENTS.has(node.name))
        err(file, L(node), `<${node.name}> is not in mdxComponents (src/components/mdx.tsx)`);
      const attrs = {};
      for (const a of node.attributes) {
        if (a.type === "mdxJsxExpressionAttribute") { err(file, L(node), `<${node.name}>: spread props are not allowed`); continue; }
        if (a.value && typeof a.value === "object") err(file, L(node), `<${node.name} ${a.name}={...}>: props must be strings, e.g. ${a.name}="..."`);
        else attrs[a.name] = a.value;
      }
      if (node.name === "Diagram" && !diagramExists(attrs.name ?? "")) err(file, L(node), `<Diagram name="${attrs.name}">: content/diagrams/${attrs.name}.svg not found`);
      if (node.name === "Lab" && !LABS.has(attrs.name ?? "")) err(file, L(node), `<Lab name="${attrs.name}">: not registered in src/components/labs/index.tsx`);
    });
  };
}

// Lessons written without <Level> blocks on purpose, exempt from the Levels check only
// (every other check, the <Quiz> included, still applies to them):
//   - 98-escore.mdx in every unit: a case study of the Escore app, not a concept lesson
//   - every lesson of the capstone unit (18-capstone): project phases built from tasks
const isWithoutLevels = (file) => {
  const f = rel(file);
  return path.basename(f) === "98-escore.mdx" || /^content\/units\/\d+-capstone\//.test(f);
};

for (const file of targets) {
  if (!fs.existsSync(file)) { err(file, 0, "file not found"); continue; }
  const { data, content, offset, lineAt } = read(file);

  try {
    await compile(content, { remarkPlugins: [remarkGfm, inspect(file, offset)] });
  } catch (e) {
    const line = (e.line ?? e.place?.line ?? e.place?.start?.line ?? 0) + (e.line || e.place ? offset : 0);
    err(file, line, `MDX does not compile: ${e.reason ?? e.message}`);
  }

  // tag shapes the regex extractors in course.ts / build-index.mjs depend on
  for (const m of content.matchAll(/<(Task|Question|LogBox)\b[^>]*>/g))
    if (!/^<\w+ id="[^"]+"/.test(m[0])) err(file, lineAt(m.index), `${m[0]}: must start with id="..." (double quotes) or it drops out of progress tracking`);
  for (const m of content.matchAll(/<Level\b[^>]*>/g))
    if (!/^<Level n="\d" title="[^"]+">$/.test(m[0])) err(file, lineAt(m.index), `${m[0]}: must be exactly <Level n="1" title="...">`);
  const questions = [...content.matchAll(/<Question id="([^"]+)">/g)];
  const cards = new Set([...content.matchAll(/<Question id="([^"]+)">\s*<Ask>[\s\S]*?<\/Ask>\s*<Answer>[\s\S]*?<\/Answer>/g)].map((m) => m[1]));
  for (const q of questions)
    if (!cards.has(q[1])) err(file, lineAt(q.index), `Question "${q[1]}": <Ask>..</Ask><Answer>..</Answer> must follow directly, or it never becomes a flashcard`);

  for (const t of TEMPLATE_LEFTOVERS) {
    const i = content.indexOf(t);
    if (i >= 0) err(file, lineAt(i), `template placeholder left in: "${t}"`);
  }
  if (TEMPLATE_LEFTOVERS.includes(String(data.description ?? "").trim())) err(file, 2, "frontmatter description is still the template placeholder");

  // lesson structure: required for drafts (new lessons), a warning for older ones
  const isLesson = rel(file).startsWith("content/units/") && !path.basename(file).startsWith("_") && data.type !== "practice";
  if (isLesson) {
    const report = data.draft ? err : warn;
    if (!data.title) err(file, 1, "frontmatter title is missing");
    if (!data.description) err(file, 1, "frontmatter description is missing");
    const levels = [...content.matchAll(/<Level n="(\d)"/g)].map((m) => m[1]).join(",");
    if (levels !== "1,2,3,4" && !isWithoutLevels(file)) report(file, 0, `Levels found [${levels || "none"}], expected 1,2,3,4 in order`);
    const quizzes = [...content.matchAll(/<Quiz>([\s\S]*?)<\/Quiz>/g)];
    if (quizzes.length !== 1) report(file, 0, `expected one <Quiz>, found ${quizzes.length}`);
    else {
      const n = (quizzes[0][1].match(/<Question id=/g) ?? []).length;
      if (n < 3 || n > 5) report(file, lineAt(quizzes[0].index), `<Quiz> has ${n} questions, expected 3 to 5`);
    }
    if (data.draft && !/<Note kind="interview"/.test(content)) err(file, 0, 'missing <Note kind="interview"> (Level 4)');
  }
}

// ---------- report ----------
if (warnings.length) console.warn(`warnings (${warnings.length}):\n  ` + warnings.join("\n  "));
if (errors.length) {
  console.error(`errors (${errors.length}):\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log(`check-content: ${targets.length} file(s) OK, ${seen.size} ids unique site-wide`);
