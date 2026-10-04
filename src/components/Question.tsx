"use client";
import { KEYS, useStoredEntry } from "@/lib/storage";

type State = "know" | "review";

/** Self-check question: <Question id><Ask>…</Ask><Answer>…</Answer></Question> */
export default function Question({ id, children }: { id: string; children: React.ReactNode }) {
  const [state, setState] = useStoredEntry<State>(KEYS.quiz, id);
  return (
    <details className="qa" data-state={state} id={`q-${id}`}>
      {children}
      <div className="qa-actions">
        <button type="button" className={`know${state === "know" ? " on" : ""}`} onClick={() => setState(state === "know" ? undefined : "know")}>عرفتها</button>
        <button type="button" className={`rev${state === "review" ? " on" : ""}`} onClick={() => setState(state === "review" ? undefined : "review")}>راجعها تاني</button>
      </div>
    </details>
  );
}
