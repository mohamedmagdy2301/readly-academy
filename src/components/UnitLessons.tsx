"use client";
import Link from "next/link";
import { EMPTY_MAP, KEYS, useStored } from "@/lib/storage";

type L = { id: string; title: string; href: string; num: number; type: "lesson" | "practice"; description?: string };

export default function UnitLessons({ lessons }: { lessons: L[] }) {
  const [done] = useStored<Record<string, boolean>>(KEYS.done, EMPTY_MAP);
  return (
    <ol className="lesson-cards">
      {lessons.map((l) => (
        <li key={l.id}>
          <Link href={l.href} className={`lesson-card${done[l.id] ? " done" : ""}`}>
            <span className="l-num">{done[l.id] ? "✓" : l.num}</span>
            <span className="l-body">
              <b>{l.title}{l.type === "practice" && <span className="pill">تطبيق</span>}</b>
              {l.description && <span>{l.description}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
