import Link from "next/link";
import type { Metadata } from "next";
import CourseShell from "@/components/CourseShell";
import { getCourse } from "@/lib/course";

export const metadata: Metadata = { title: "الكورس" };

export default function CoursePage() {
  const units = getCourse();
  return (
    <CourseShell>
      <header className="section-head">
        <h1>الكورس</h1>
        <p className="lede">{units.length} {units.length >= 3 && units.length <= 10 ? "وحدات" : "وحدة"}، و{units.reduce((n, u) => n + u.lessons.length, 0)} درس. امشي بالترتيب، وكل وحدة بتخلص بمهام تطبّقها في Readly.</p>
      </header>
      <div className="unit-grid">
        {units.map((u) => (
          <article key={u.slug} className="unit-card">
            <Link href={u.href} className="unit-card-head"><span className="u-num">{u.num}</span><span><b>{u.title}</b>{u.description && <small>{u.description}</small>}</span></Link>
            <ol>
              {u.lessons.map((l) => <li key={l.id}><Link href={l.href}>{l.title}</Link>{l.type === "practice" && <span className="pill">تطبيق</span>}</li>)}
            </ol>
          </article>
        ))}
      </div>
    </CourseShell>
  );
}
