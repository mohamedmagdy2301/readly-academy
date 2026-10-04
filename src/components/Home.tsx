"use client";
import Link from "next/link";
import type { Manifest } from "@/lib/course";
import { EMPTY_MAP, KEYS, useStored } from "@/lib/storage";

/** Home dashboard: "continue" card + per-unit progress. */
export default function HomeDashboard({ manifest }: { manifest: Manifest }) {
  const [done] = useStored<Record<string, boolean>>(KEYS.done, EMPTY_MAP);
  const [tasks] = useStored<Record<string, boolean>>(KEYS.tasks, EMPTY_MAP);
  const [quiz] = useStored<Record<string, string>>(KEYS.quiz, EMPTY_MAP);

  const lessons = manifest.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u })));
  const next = lessons.find((l) => !done[l.id]);
  const doneCount = lessons.filter((l) => done[l.id]).length;
  const allTasks = lessons.flatMap((l) => l.taskIds);
  const allQs = lessons.flatMap((l) => l.questionIds);
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;

  return (
    <>
      <div className="continue-card">
        {next ? (
          <>
            <small>{doneCount === 0 ? "ابدأ من هنا" : "كمّل من هنا"} · الوحدة {next.unit.num}: {next.unit.title}</small>
            <h2>{next.title}</h2>
            <Link className="btn" href={next.href}>{doneCount === 0 ? "ابدأ الكورس" : "كمّل الدرس"}</Link>
          </>
        ) : (
          <>
            <small>مبروك</small>
            <h2>خلصت كل دروس الكورس</h2>
            <Link className="btn" href="/review/">راجع من صفحة المراجعة</Link>
          </>
        )}
        <div className="overall">
          <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          <small>{doneCount} من {lessons.length} درس · {allTasks.filter((t) => tasks[t]).length} من {allTasks.length} مهمة · {allQs.filter((q) => quiz[q] === "know").length} من {allQs.length} سؤال عرفتها</small>
        </div>
      </div>

      <h2 className="home-h2">الوحدات</h2>
      <ol className="unit-list">
        {manifest.map((u) => {
          const d = u.lessons.filter((l) => done[l.id]).length;
          const p = u.lessons.length ? (d / u.lessons.length) * 100 : 0;
          return (
            <li key={u.slug}>
              <Link href={u.href} className={`unit-row${d === u.lessons.length && d > 0 ? " complete" : ""}`}>
                <span className="u-num">{u.num}</span>
                <span className="u-body">
                  <b>{u.title}</b>
                  <span className="bar small"><span style={{ width: `${p}%` }} /></span>
                </span>
                <span className="u-count">{d}/{u.lessons.length}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
