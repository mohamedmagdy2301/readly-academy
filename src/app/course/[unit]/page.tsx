import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseShell from "@/components/CourseShell";
import UnitLessons from "@/components/UnitLessons";
import { renderMdx } from "@/components/render";
import { getCourse, getUnit } from "@/lib/course";

export const dynamicParams = false;
export function generateStaticParams() {
  return getCourse().map((u) => ({ unit: u.slug }));
}

type Props = { params: Promise<{ unit: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { unit } = await params;
  const u = getUnit(unit);
  return { title: u ? `الوحدة ${u.num}: ${u.title}` : undefined, description: u?.description };
}

export default async function UnitPage({ params }: Props) {
  const { unit } = await params;
  const u = getUnit(unit);
  if (!u) notFound();
  const intro = await renderMdx(u.intro);
  const first = u.lessons[0];
  return (
    <CourseShell currentUnit={u.slug}>
      <header className="doc-head">
        <p className="kicker">الوحدة {u.num}</p>
        <h1>{u.title}</h1>
        {u.description && <p className="lede">{u.description}</p>}
      </header>
      <div className="unit-intro">{intro}</div>
      <h2 className="home-h2">الدروس</h2>
      <UnitLessons lessons={u.lessons.map((l) => ({ id: l.id, title: l.title, href: l.href, num: l.num, type: l.type, description: l.description }))} />
      {first && <p style={{ marginTop: 18 }}><Link className="btn" href={first.href}>ابدأ الوحدة</Link></p>}
    </CourseShell>
  );
}
