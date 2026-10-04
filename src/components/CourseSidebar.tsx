"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Manifest } from "@/lib/course";
import { EMPTY_MAP, KEYS, useStored } from "@/lib/storage";

/** Course outline: units (collapsible) → lessons with done ticks. */
export default function CourseSidebar({ manifest, currentId, currentUnit }: { manifest: Manifest; currentId?: string; currentUnit?: string }) {
  const [done] = useStored<Record<string, boolean>>(KEYS.done, EMPTY_MAP);
  const box = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (window.innerWidth < 960 && box.current) box.current.open = false; }, []);

  return (
    <div className="toc" role="navigation" aria-label="محتويات الكورس">
      <details className="toc-box" open ref={box}>
        <summary>محتويات الكورس</summary>
        <div className="outline">
          {manifest.map((u) => {
            const finished = u.lessons.filter((l) => done[l.id]).length;
            return (
              <details key={u.slug} className="outline-unit" open={u.slug === currentUnit}>
                <summary>
                  <span className="u-num">{u.num}</span>
                  <span className="u-title">{u.title}</span>
                  <span className="u-count">{finished}/{u.lessons.length}</span>
                </summary>
                <ol>
                  <li><Link href={u.href} className={!currentId && u.slug === currentUnit ? "active" : undefined}><span className="l-num">◇</span><span>نظرة على الوحدة</span></Link></li>
                  {u.lessons.map((l) => (
                    <li key={l.id}>
                      <Link href={l.href} className={l.id === currentId ? "active" : undefined}>
                        <span className="l-num">{done[l.id] ? <span className="ok">✓</span> : l.num}</span>
                        <span>{l.title}</span>
                        {l.type === "practice" && <span className="pill">تطبيق</span>}
                      </Link>
                    </li>
                  ))}
                </ol>
              </details>
            );
          })}
        </div>
      </details>
    </div>
  );
}
