"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KEYS, useStoredEntry } from "@/lib/storage";

type L = { href: string; title: string } | null;

/** "Mark as done" + next/previous lesson navigation. */
export default function LessonFooter({ id, prev, next }: { id: string; prev: L; next: L }) {
  const router = useRouter();
  const [done, setDone] = useStoredEntry<boolean>(KEYS.done, id);
  return (
    <div className="lesson-footer">
      <div className="lesson-done">
        {done ? (
          <>
            <span className="done-badge">✓ خلصت الدرس ده</span>
            <button type="button" className="btn ghost" onClick={() => setDone(undefined)}>تراجع</button>
            {next && <Link className="btn" href={next.href}>الدرس اللي بعده</Link>}
          </>
        ) : (
          <button type="button" className="btn good" onClick={() => { setDone(true); if (next) router.push(next.href); }}>
            {next ? "خلصت الدرس، اللي بعده" : "خلصت الدرس"}
          </button>
        )}
      </div>
      <nav className="prev-next" aria-label="التنقل بين الدروس">
        {prev ? <Link href={prev.href}><small>اللي قبله</small>{prev.title}</Link> : <span />}
        {next ? <Link className="next" href={next.href}><small>اللي بعده</small>{next.title}</Link> : <span />}
      </nav>
    </div>
  );
}
