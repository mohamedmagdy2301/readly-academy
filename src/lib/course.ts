import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Course content lives in content/units/<NN-unit>/:
 *   _unit.mdx        unit metadata + short intro
 *   <NN-lesson>.mdx  one file per lesson (NN = order, "99-practice" is always last)
 * The NN- prefix controls order and is stripped from URLs.
 */
const UNITS_DIR = path.join(process.cwd(), "content", "units");
const stripOrder = (name: string) => name.replace(/^\d+-/, "").replace(/\.mdx$/, "");

export type LessonType = "lesson" | "practice";

export type Lesson = {
  id: string; // "<unit>/<lesson>": the key used for progress
  unit: string;
  slug: string;
  num: number; // 1-based position inside the unit
  title: string;
  description?: string;
  type: LessonType;
  minutes?: number;
  href: string;
  body: string;
  taskIds: string[];
  questionIds: string[];
  log?: { id: string; question: string };
};

export type Unit = {
  slug: string;
  num: number; // 0-based (unit 0 = "البداية")
  title: string;
  description?: string;
  intro: string;
  href: string;
  lessons: Lesson[];
};

function parse(file: string) {
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return { data, content };
}

function plain(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\\([{}|])/g, "$1").replace(/`/g, "").trim();
}

let cache: Unit[] | null = null;

export function getCourse(): Unit[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const dirs = fs.readdirSync(UNITS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const units = dirs.map((dir, ui) => {
    const unitSlug = stripOrder(dir);
    const meta = parse(path.join(UNITS_DIR, dir, "_unit.mdx"));
    const files = fs.readdirSync(path.join(UNITS_DIR, dir)).filter((f) => f.endsWith(".mdx") && !f.startsWith("_")).sort();
    const lessons = files
      .map((file) => ({ file, ...parse(path.join(UNITS_DIR, dir, file)) }))
      // drafts are visible in `npm run dev` (marked "مسودة") and hidden from the production build
      .filter(({ data }) => !data.draft || process.env.NODE_ENV === "development")
      .map(({ file, data, content }, li): Lesson => {
        const slug = stripOrder(file);
        const log = content.match(/<LogBox id="([^"]+)"/);
        const rq = content.match(/<ReviewQuestion>([\s\S]*?)<\/ReviewQuestion>/);
        return {
          id: `${unitSlug}/${slug}`,
          unit: unitSlug,
          slug,
          num: li + 1,
          title: String(data.title ?? slug) + (data.draft ? " (مسودة)" : ""),
          description: data.description ? String(data.description) : undefined,
          type: data.type === "practice" ? "practice" : "lesson",
          minutes: data.minutes ? Number(data.minutes) : undefined,
          href: `/course/${unitSlug}/${slug}/`,
          body: content,
          taskIds: [...content.matchAll(/<Task id="([^"]+)"/g)].map((m) => m[1]),
          questionIds: [...content.matchAll(/<Question id="([^"]+)"/g)].map((m) => m[1]),
          log: log ? { id: log[1], question: rq ? plain(rq[1]) : "" } : undefined,
        };
      });
    return {
      slug: unitSlug,
      num: ui,
      title: String(meta.data.title ?? unitSlug),
      description: meta.data.description ? String(meta.data.description) : undefined,
      intro: meta.content,
      href: `/course/${unitSlug}/`,
      lessons,
    } satisfies Unit;
  });
  cache = units;
  return units;
}

export function getUnit(slug: string) {
  return getCourse().find((u) => u.slug === slug);
}

export function getLesson(unit: string, slug: string) {
  return getUnit(unit)?.lessons.find((l) => l.slug === slug);
}

export function allLessons() {
  return getCourse().flatMap((u) => u.lessons);
}

/** Small, serializable version of the course for client components (no bodies). */
export type Manifest = {
  slug: string; num: number; title: string; href: string;
  lessons: { id: string; title: string; href: string; type: LessonType; num: number; taskIds: string[]; questionIds: string[]; log?: { id: string; question: string } }[];
}[];

export function getManifest(): Manifest {
  return getCourse().map((u) => ({
    slug: u.slug, num: u.num, title: u.title, href: u.href,
    lessons: u.lessons.map((l) => ({ id: l.id, title: l.title, href: l.href, type: l.type, num: l.num, taskIds: l.taskIds, questionIds: l.questionIds, log: l.log })),
  }));
}
