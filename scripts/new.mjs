// Scaffold new content.
//   npm run new -- unit <slug> "عنوان الوحدة"
//   npm run new -- lesson <unit-slug> <lesson-slug> "عنوان الدرس"
import fs from "node:fs";
import path from "node:path";

const UNITS = path.join(process.cwd(), "content", "units");
const TPL = path.join(process.cwd(), "content", "_templates");
const [kind, ...args] = process.argv.slice(2);
const fail = (m) => { console.error(m); process.exit(1); };
const pad = (n) => String(n).padStart(2, "0");
const fill = (file, vars) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`__${k}__`, v), fs.readFileSync(path.join(TPL, file), "utf8"));
const slugOk = (s) => /^[a-z0-9-]+$/.test(s ?? "");

if (kind === "unit") {
  const [slug, title] = args;
  if (!slugOk(slug) || !title) fail('usage: npm run new -- unit <slug> "العنوان"  (slug: a-z, 0-9, -)');
  const nums = fs.readdirSync(UNITS).map((d) => parseInt(d, 10)).filter((n) => !isNaN(n));
  const dir = path.join(UNITS, `${pad(Math.max(-1, ...nums) + 1)}-${slug}`);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, "_unit.mdx"), fill("unit.mdx", { TITLE: title }));
  fs.writeFileSync(path.join(dir, "99-practice.mdx"), fill("practice.mdx", { ID: slug }));
  console.log(`created ${path.relative(process.cwd(), dir)}/ (_unit.mdx, 99-practice.mdx)`);
} else if (kind === "lesson") {
  const [unit, slug, title] = args;
  if (!unit || !slugOk(slug) || !title) fail('usage: npm run new -- lesson <unit-slug> <lesson-slug> "العنوان"');
  const dirName = fs.readdirSync(UNITS).find((d) => d === unit || d.replace(/^\d+-/, "") === unit);
  if (!dirName) fail(`unit "${unit}" not found in content/units`);
  const dir = path.join(UNITS, dirName);
  const nums = fs.readdirSync(dir).map((f) => parseInt(f, 10)).filter((n) => !isNaN(n) && n < 99);
  const file = path.join(dir, `${pad(Math.max(0, ...nums) + 1)}-${slug}.mdx`);
  fs.writeFileSync(file, fill("lesson.mdx", { TITLE: title, ID: slug }));
  console.log(`created ${path.relative(process.cwd(), file)} (draft: true — remove it to publish)`);
} else {
  fail('usage:\n  npm run new -- unit <slug> "العنوان"\n  npm run new -- lesson <unit-slug> <lesson-slug> "العنوان"');
}
