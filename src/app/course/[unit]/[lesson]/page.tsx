import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseShell from "@/components/CourseShell";
import LessonFooter from "@/components/LessonFooter";
import { renderMdx } from "@/components/render";
import { allLessons, getLesson, getUnit } from "@/lib/course";

export const dynamicParams = false;
export function generateStaticParams() {
  return allLessons().map((l) => ({ unit: l.unit, lesson: l.slug }));
}

type Props = { params: Promise<{ unit: string; lesson: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { unit, lesson } = await params;
  const l = getLesson(unit, lesson);
  return { title: l?.title, description: l?.description };
}

export default async function LessonPage({ params }: Props) {
  const { unit, lesson } = await params;
  const u = getUnit(unit);
  const l = getLesson(unit, lesson);
  if (!u || !l) notFound();

  const flat = allLessons();
  const i = flat.findIndex((x) => x.id === l.id);
  const link = (x?: (typeof flat)[number]) => (x ? { href: x.href, title: x.title } : null);
  const content = await renderMdx(l.body);

  return (
    <CourseShell currentId={l.id} currentUnit={u.slug}>
      <article className="doc lesson">
        <header className="doc-head">
          <p className="kicker">الوحدة {u.num}: {u.title} · {l.type === "practice" ? "التطبيق" : `الدرس ${l.num}`}</p>
          <h1>{l.title}</h1>
          {l.description && <p className="lede">{l.description}</p>}
        </header>
        {content}
        <LessonFooter id={l.id} prev={link(flat[i - 1])} next={link(flat[i + 1])} />
      </article>
    </CourseShell>
  );
}
