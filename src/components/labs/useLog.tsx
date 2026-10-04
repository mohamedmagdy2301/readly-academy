"use client";
import { useCallback, useRef, useState } from "react";

export type LogLine = { id: number; t: string; kind: "key" | "req" | "ok" | "bad" | "drop" | "cancel"; text: React.ReactNode };

/** Timestamped event log shared by the labs. Newest first, capped at 40 lines. */
export function useLog() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const t0 = useRef(Date.now());
  const seq = useRef(0);
  const add = useCallback((kind: LogLine["kind"], text: React.ReactNode) => {
    const t = ((Date.now() - t0.current) / 1000).toFixed(2) + "s";
    setLines((prev) => [{ id: seq.current++, t, kind, text }, ...prev].slice(0, 40));
  }, []);
  const reset = useCallback(() => { t0.current = Date.now(); setLines([]); }, []);
  return { lines, add, reset };
}

export function Log({ lines }: { lines: LogLine[] }) {
  return (
    <ol className="sim-log" aria-live="polite">
      {lines.map((l) => <li key={l.id} className={l.kind}><span className="t">{l.t}</span> {l.text}</li>)}
    </ol>
  );
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
