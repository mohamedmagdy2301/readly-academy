import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** Stand-alone pages outside the course: content/review/*.mdx and content/resources/*.mdx */
export type Page = { slug: string; title: string; description?: string; order: number; body: string };

export function getPages(folder: "review" | "resources"): Page[] {
  const dir = path.join(process.cwd(), "content", folder);
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")).map((f) => {
    const { data, content } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    return { slug: f.replace(/\.mdx$/, ""), title: String(data.title), description: data.description ? String(data.description) : undefined, order: Number(data.order ?? 99), body: content };
  }).sort((a, b) => a.order - b.order);
}

export function readDiagram(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "content", "diagrams", `${name}.svg`), "utf8");
}
