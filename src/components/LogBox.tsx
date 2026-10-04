"use client";
import { KEYS, useStoredEntry } from "@/lib/storage";

/** Free-text answer to the unit's review question, saved locally. All answers are collected in /review/ ("إجاباتي"). */
export default function LogBox({ id, title = "إجابتك" }: { id: string; title?: string }) {
  const [text, setText] = useStoredEntry<string>(KEYS.log, id);
  return (
    <div className="log-entry">
      <label htmlFor={`log-${id}`}>{title}<small>اكتب إجابتك وأي حاجة وقفت معاك. الكتابة بتتحفظ لوحدها، وتلاقيها كلها في صفحة المراجعة، تاب «إجاباتي».</small></label>
      <textarea id={`log-${id}`} value={text ?? ""} placeholder="اكتب هنا..." onChange={(e) => setText(e.target.value || undefined)} />
    </div>
  );
}
