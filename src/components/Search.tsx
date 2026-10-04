"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Entry = { title: string; section: string; href: string; text: string };

/** Arabic-friendly normalization: drop diacritics/tatweel and unify common letter variants. */
function norm(s: string) {
  return s.toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
}

export default function Search() {
  const router = useRouter();
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // load the index lazily on first focus
  function ensureIndex() {
    if (index) return;
    fetch("/search-index.json").then((r) => r.json()).then(setIndex).catch(() => setIndex([]));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (e.key === "/" && tag !== "input" && tag !== "textarea") { e.preventDefault(); inputRef.current?.focus(); }
    }
    function onClick(e: MouseEvent) { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, []);

  const results = useMemo(() => {
    const query = norm(q.trim());
    if (!index || query.length < 2) return [];
    const words = query.split(/\s+/);
    return index
      .map((e) => {
        const t = norm(e.title), body = norm(e.text);
        let score = 0;
        for (const w of words) { if (t.includes(w)) score += 5; if (body.includes(w)) score += 1; }
        return { e, score };
      })
      .filter((x) => x.score >= words.length)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.e);
  }, [q, index]);

  function snippet(text: string) {
    const w = norm(q.trim()).split(/\s+/)[0] ?? "";
    const i = norm(text).indexOf(w);
    const start = Math.max(0, i - 40);
    return (start ? "…" : "") + text.slice(start, start + 120) + "…";
  }

  function go(href: string) { setOpen(false); setQ(""); inputRef.current?.blur(); router.push(href); }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        className="search"
        type="search"
        placeholder="ابحث في كل حاجة ( / )"
        aria-label="بحث"
        value={q}
        onFocus={() => { ensureIndex(); setOpen(true); }}
        onChange={(e) => { setQ(e.target.value); setSel(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          else if (e.key === "Enter" && results[sel]) go(results[sel].href);
          else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className="results" role="listbox">
          {results.length === 0 ? (
            <div className="empty">{index ? "مفيش نتايج. جرّب كلمة تانية." : "بيحمّل..."}</div>
          ) : (
            results.map((r, i) => (
              <a key={r.href + i} href={r.href} className={i === sel ? "sel" : undefined} onClick={(e) => { e.preventDefault(); go(r.href); }}>
                <small>{r.section}</small>
                {r.title}
                <span className="snip">{snippet(r.text)}</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
