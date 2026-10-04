"use client";
import Link from "next/link";
import { useState } from "react";
import { EMPTY_MAP, KEYS, useStored } from "@/lib/storage";
import LogBox from "./LogBox";

type Entry = { id: string; unit: string; question: string; href: string };

/** All review-question answers in one place, with "copy all" for sending them for review. */
export default function MyAnswers({ entries }: { entries: Entry[] }) {
  const [log] = useStored<Record<string, string>>(KEYS.log, EMPTY_MAP);
  const [status, setStatus] = useState("");
  function copyAll() {
    const parts = entries.filter((e) => log[e.id]?.trim()).map((e) => `${e.unit}\nالسؤال: ${e.question}\nإجابتي:\n${log[e.id].trim()}`);
    if (!parts.length) { setStatus("مفيش إجابات مكتوبة لسه."); return; }
    navigator.clipboard?.writeText(parts.join("\n\n")).then(() => setStatus("اتنسخت. الصقها في الشات للمراجعة.")).catch(() => setStatus("النسخ مش متاح هنا، انسخ يدوي."));
  }
  return (
    <div className="answers">
      <div className="log-actions" style={{ marginTop: 0 }}>
        <button className="btn" type="button" onClick={copyAll}>انسخ كل إجاباتي</button>
        <span className="log-status" aria-live="polite">{status}</span>
      </div>
      {entries.map((e) => (
        <div key={e.id} className="answer-card">
          <h3><Link href={e.href}>{e.unit}</Link></h3>
          <p className="answer-q">{e.question}</p>
          <LogBox id={e.id} />
        </div>
      ))}
    </div>
  );
}
