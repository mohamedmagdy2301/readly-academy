// Generates static JSON used by client features:
//   public/search-index.json  -> site search
//   public/cards.json         -> review flashcards
// Runs automatically before `dev` and `build`.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const strip = (n) => n.replace(/^\d+-/, "").replace(/\.mdx$/, "");

const pages = []; // { title, label, href, body, anchorBase }

// course lessons
const unitsDir = path.join(CONTENT, "units");
for (const dir of fs.readdirSync(unitsDir).sort()) {
  const full = path.join(unitsDir, dir);
  if (!fs.statSync(full).isDirectory()) continue;
  const unit = matter(fs.readFileSync(path.join(full, "_unit.mdx"), "utf8"));
  const unitSlug = strip(dir);
  pages.push({ title: `الوحدة: ${unit.data.title}`, label: "الكورس", href: `/course/${unitSlug}/`, body: unit.content });
  for (const file of fs.readdirSync(full).filter((f) => f.endsWith(".mdx") && !f.startsWith("_")).sort()) {
    const { data, content } = matter(fs.readFileSync(path.join(full, file), "utf8"));
    if (data.draft) continue;
    pages.push({ title: String(data.title), label: `الكورس · ${unit.data.title}`, href: `/course/${unitSlug}/${strip(file)}/`, body: content });
  }
}
// review & resources (single pages with tabs: anchors live on the parent page)
for (const [folder, label] of [["review", "المراجعة"], ["resources", "المصادر"]]) {
  for (const file of fs.readdirSync(path.join(CONTENT, folder)).filter((f) => f.endsWith(".mdx"))) {
    const { data, content } = matter(fs.readFileSync(path.join(CONTENT, folder, file), "utf8"));
    pages.push({ title: String(data.title), label, href: `/${folder}/#${strip(file)}`, anchorBase: `/${folder}/`, body: content });
  }
}

/** MDX → plain text for search and cards. */
function plain(s) {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\([{}|])/g, "$1")
    .replace(/[`*#|>]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- validate ids (progress keys must be unique site-wide) ----------
const seen = new Map();
const dupes = [];
for (const p of pages) {
  for (const m of p.body.matchAll(/<(Task|Question|LogBox) id="([^"]+)"/g)) {
    const key = `${m[1]}:${m[2]}`;
    if (seen.has(key)) dupes.push(`${m[1]} id="${m[2]}" in ${p.href} (already used in ${seen.get(key)})`);
    else seen.set(key, p.href);
  }
}
if (dupes.length) {
  console.error("Duplicate ids found. Each Task / Question / LogBox id must be unique:\n  " + dupes.join("\n  "));
  process.exit(1);
}

const search = [];
const cards = [];
for (const p of pages) {
  const base = p.anchorBase ?? p.href;
  const slugger = new GithubSlugger();
  const parts = p.body.split(/^#{2,3} (.+)$/m);
  search.push({ title: p.title, section: p.label, href: p.href, text: plain(parts[0]).slice(0, 1500) });
  for (const m of p.body.matchAll(/<Level n="\d" title="([^"]+)">/g)) {
    search.push({ title: `${m[1]} · ${p.title}`, section: p.label, href: p.href, text: plain(p.body.slice(m.index, m.index + 1500)).slice(0, 700) });
  }
  for (let i = 1; i < parts.length; i += 2) {
    const id = slugger.slug(parts[i].replace(/`/g, "").replace(/<[^>]+>/g, "").trim());
    search.push({ title: `${plain(parts[i])} · ${p.title}`, section: p.label, href: `${base}#${id}`, text: plain(parts[i + 1] ?? "").slice(0, 700) });
  }
  for (const q of p.body.matchAll(/<Question id="([^"]+)">\s*<Ask>([\s\S]*?)<\/Ask>\s*<Answer>([\s\S]*?)<\/Answer>/g)) {
    cards.push({ id: q[1], type: "q", q: q[2].trim(), a: q[3].trim(), meta: p.title, href: `${base}#q-${q[1]}` });
  }
  if (p.href === "/review/#glossary") {
    const rows = p.body.split("\n").filter((l) => l.startsWith("|")).slice(2);
    rows.forEach((row, i) => {
      const c = row.split(/(?<!\\)\|/).slice(1, -1).map((x) => x.trim());
      if (c.length >= 3) cards.push({ id: `term-${i}`, type: "term", q: `يعني إيه \`${c[0]}\`؟`, a: `${c[1]}<br />مثال من Readly: ${c[2]}`, meta: "المسرد", href: "/review/#glossary" });
    });
  }
}

const pub = path.join(ROOT, "public");
fs.mkdirSync(pub, { recursive: true });
fs.writeFileSync(path.join(pub, "search-index.json"), JSON.stringify(search));
fs.writeFileSync(path.join(pub, "cards.json"), JSON.stringify(cards));
fs.rmSync(path.join(pub, "stats.json"), { force: true });
console.log(`index: ${pages.length} pages, ${search.length} search entries, ${cards.length} cards`);
