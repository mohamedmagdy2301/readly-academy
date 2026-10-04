"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EMPTY_MAP, KEYS, useStored } from "@/lib/storage";

type Card = { id: string; type: "q" | "term"; q: string; a: string; meta: string; href: string };
type Filter = "all" | "review" | "new" | "term";

/** Minimal inline markdown → HTML for card text (code spans, bold tags, links). */
function inline(md: string) {
  const esc = (s: string) => s.replace(/&(?!(lt|gt|amp|quot|#\d+);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const parts = md.replace(/\\([{}|])/g, "$1").split(/(`[^`]+`)/g);
  return parts.map((p) => {
    if (p.startsWith("`") && p.endsWith("`")) return `<code>${esc(p.slice(1, -1))}</code>`;
    return esc(p)
      .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, "<b>$1</b>")
      .replace(/&lt;br \/&gt;/g, "<br>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }).join("");
}

export default function Flashcards() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [quiz, setQuiz] = useStored<Record<string, string>>(KEYS.quiz, EMPTY_MAP);
  const [filter, setFilter] = useState<Filter>("all");
  const [cur, setCur] = useState<Card | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => { fetch("/cards.json").then((r) => r.json()).then(setCards).catch(() => setCards([])); }, []);

  const pool = useMemo(() => (cards ?? []).filter((c) => {
    const s = quiz[c.id];
    if (filter === "review") return s === "review";
    if (filter === "new") return !s;
    if (filter === "term") return c.type === "term";
    return true;
  }), [cards, quiz, filter]);

  const next = useCallback((exclude?: string) => {
    setShown(false);
    const p = pool.filter((c) => c.id !== exclude);
    const list = p.length ? p : pool;
    setCur(list.length ? list[Math.floor(Math.random() * list.length)] : null);
  }, [pool]);

  useEffect(() => { if (cards) next(); /* new card when the filter or data changes */ }, [cards, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  function grade(v: "know" | "review") {
    if (!cur) return;
    setQuiz((prev) => ({ ...prev, [cur.id]: v }));
    next(cur.id);
  }

  const known = (cards ?? []).filter((c) => quiz[c.id] === "know").length;
  const FILTERS: [Filter, string][] = [["all", "الكل"], ["review", "محتاج مراجعة"], ["new", "لسه ماتحلش"], ["term", "مصطلحات"]];

  return (
    <section id="practice">
      <div className="pr-filters" role="group" aria-label="نوع الكروت">
        {FILTERS.map(([f, label]) => (
          <button key={f} type="button" className={`chip-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>{label}</button>
        ))}
      </div>
      <div className="flash">
        {!cards ? <p>بيحمّل الكروت...</p> : !cur ? (
          <div className="flash-q">{filter === "review" ? "مفيش كروت محتاجة مراجعة. عاش!" : "مفيش كروت في الفلتر ده."}</div>
        ) : (
          <>
            <small className="flash-meta">
              <Link href={cur.href}>{cur.meta}</Link>
              {quiz[cur.id] === "review" ? " · محتاج مراجعة" : quiz[cur.id] === "know" ? " · عرفتها قبل كده" : ""}
            </small>
            <div className="flash-q" dangerouslySetInnerHTML={{ __html: inline(cur.q) }} />
            {shown && <div className="flash-a" dangerouslySetInnerHTML={{ __html: inline(cur.a) }} />}
            <div className="flash-actions">
              {!shown ? (
                <button className="btn" type="button" onClick={() => setShown(true)}>اعرض الإجابة</button>
              ) : (
                <>
                  <button className="btn good" type="button" onClick={() => grade("know")}>عرفتها</button>
                  <button className="btn warn" type="button" onClick={() => grade("review")}>راجعها تاني</button>
                </>
              )}
              <button className="btn ghost" type="button" onClick={() => next(cur.id)}>تخطّي</button>
            </div>
          </>
        )}
      </div>
      {cards && <p className="pr-count">عرفت {known} من {cards.length} كارت. في الفلتر ده: {pool.length}.</p>}
    </section>
  );
}
