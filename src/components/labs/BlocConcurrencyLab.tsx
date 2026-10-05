"use client";
import { useEffect, useRef, useState } from "react";
import { Log, useLog } from "./useLog";

type Mode = "concurrent" | "sequential" | "droppable" | "restartable";
type Status = "queued" | "running" | "done" | "dropped" | "cancelled";
type Ev = { id: number; added: number; start?: number; end?: number; status: Status; ms: number; late?: boolean };

const MODES: { mode: Mode; hint: string }[] = [
  { mode: "concurrent", hint: "الافتراضي: كل event يبدأ فورًا، والنتايج ترجع بأي ترتيب" },
  { mode: "sequential", hint: "طابور: كل event يستنى اللي قبله يخلص" },
  { mode: "droppable", hint: "لو في واحد شغال، أي event جديد بيترمي" },
  { mode: "restartable", hint: "أي event جديد بيلغي اللي شغال ويبدأ هو" },
];

/** Different durations on purpose, like real requests: that's what makes concurrent race. */
const DURATIONS = [1800, 900, 1400, 700, 1200];
const MAX_ROWS = 8;

export default function BlocConcurrencyLab() {
  const [mode, setMode] = useState<Mode>("concurrent");
  const [events, setEvents] = useState<Ev[]>([]);
  const [shown, setShown] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const { lines, add, reset: resetLog } = useLog();

  const t0 = useRef(0);
  const seq = useRef(0);
  const evs = useRef<Ev[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const lastEmitted = useRef(0); // id of the newest event that emitted so far
  const modeRef = useRef(mode); modeRef.current = mode;

  const elapsed = () => Date.now() - t0.current;
  const commit = () => setEvents([...evs.current]);
  const patch = (id: number, p: Partial<Ev>) => {
    evs.current = evs.current.map((e) => (e.id === id ? { ...e, ...p } : e));
    commit();
  };

  const busy = events.some((e) => e.status === "running" || e.status === "queued");
  useEffect(() => {
    if (!busy) return;
    const h = setInterval(() => setNow(elapsed()), 80);
    return () => clearInterval(h);
  }, [busy]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function run(ev: Ev) {
    patch(ev.id, { status: "running", start: elapsed() });
    add("req", <>الـ handler بتاع event #{ev.id} بدأ، وهياخد {ev.ms}ms</>);
    timers.current.set(ev.id, setTimeout(() => finish(ev.id), ev.ms));
  }

  function finish(id: number) {
    timers.current.delete(id);
    const late = id < lastEmitted.current;
    patch(id, { status: "done", end: elapsed(), late });
    setShown(id);
    if (late) add("bad", <>event #{id} خلص متأخر وعمل emit فوق نتيجة #{lastEmitted.current} الأحدث!</>);
    else { lastEmitted.current = id; add("ok", <>event #{id} خلص وعمل emit: الشاشة بتعرض نتيجة #{id}</>); }
    if (modeRef.current === "sequential") {
      const next = evs.current.find((e) => e.status === "queued");
      if (next) run(next);
    }
  }

  function fire() {
    if (seq.current === 0) t0.current = Date.now();
    const id = ++seq.current;
    const ev: Ev = { id, added: elapsed(), status: "queued", ms: DURATIONS[(id - 1) % DURATIONS.length] };
    evs.current = [...evs.current, ev].slice(-MAX_ROWS);
    commit();
    setNow(elapsed());
    add("key", <>اتبعت event #{id}</>);

    const running = evs.current.filter((e) => e.status === "running");
    switch (modeRef.current) {
      case "concurrent":
        run(ev);
        break;
      case "sequential":
        if (running.length) add("cancel", <>event #{id} في الطابور، مستني اللي قبله</>);
        else run(ev);
        break;
      case "droppable":
        if (running.length) {
          patch(id, { status: "dropped", end: elapsed() });
          add("drop", <>event #{id} اترمى: في handler لسه شغال</>);
        } else run(ev);
        break;
      case "restartable":
        for (const r of running) {
          clearTimeout(timers.current.get(r.id));
          timers.current.delete(r.id);
          patch(r.id, { status: "cancelled", end: elapsed() });
          add("cancel", <>event #{r.id} اتلغى، والـ emit بتاعه مش هيوصل</>);
        }
        run(ev);
        break;
    }
  }

  function restart(next: Mode = mode) {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    evs.current = []; seq.current = 0; lastEmitted.current = 0;
    setEvents([]); setShown(null); setNow(0); setMode(next); resetLog();
  }

  const count = (s: Status) => events.filter((e) => e.status === s).length;
  const span = Math.max(6000, now + 400);
  const pct = (ms: number) => `${Math.min(100, (ms / span) * 100)}%`;
  const newest = seq.current;
  const stale = shown !== null && newest > 0 && !busy && events.some((e) => e.id === shown && e.late);

  return (
    <section className="lab">
      <h2>الـ transformers بتاعة الـ Bloc</h2>
      <p>كل event هنا الـ handler بتاعه بيستنى طلب ياخد بين 0.7 و1.8 ثانية، وبعدين يعمل emit. اختار transformer، ودوس «ابعت event» 3 مرات ورا بعض بسرعة، وبص على الخط الزمني وعلى الشاشة بتعرض نتيجة مين في الآخر.</p>
      <div className="lab-controls" role="radiogroup" aria-label="الـ transformer">
        {MODES.map((m) => (
          <button key={m.mode} type="button" role="radio" aria-checked={mode === m.mode}
            className={`chip-btn${mode === m.mode ? " active" : ""}`} onClick={() => restart(m.mode)} dir="ltr">
            {m.mode}()
          </button>
        ))}
      </div>
      <p className="lab-hint" style={{ marginTop: 0 }}>{MODES.find((m) => m.mode === mode)!.hint}</p>
      <div className="lab-controls">
        <button className="btn" type="button" onClick={fire}>ابعت event</button>
        <button className="btn ghost" type="button" onClick={() => restart()}>ابدأ من جديد</button>
      </div>
      <div className="lab-stats">
        <div><b>{newest}</b><small>events اتبعتت</small></div>
        <div><b>{count("done")}</b><small>emit حصل</small></div>
        <div><b>{count("dropped") + count("cancelled")}</b><small>اترمت أو اتلغت</small></div>
        <div><b dir="ltr">{shown === null ? "—" : `#${shown}`}</b><small>الشاشة بتعرض نتيجة</small></div>
      </div>
      {stale && <div className="lab-warn">الشاشة بتعرض نتيجة event أقدم من آخر واحد خلص. ده الـ race اللي الـ concurrent بيسمح بيه.</div>}
      <Timeline events={events} pct={pct} now={now} />
      <Log lines={lines} />
    </section>
  );
}

const COLORS: Record<Status, { bg: string; label: string }> = {
  queued: { bg: "var(--line)", label: "مستني" },
  running: { bg: "var(--accent)", label: "شغال" },
  done: { bg: "var(--good)", label: "emit" },
  dropped: { bg: "var(--deep)", label: "اترمى" },
  cancelled: { bg: "var(--muted)", label: "اتلغى" },
};

function Timeline({ events, pct, now }: { events: Ev[]; pct: (ms: number) => string; now: number }) {
  if (!events.length) return <p className="lab-hint">الخط الزمني هيظهر هنا أول ما تبعت event.</p>;
  return (
    <div dir="ltr" style={{ display: "grid", gap: 6, margin: "12px 0" }} aria-label="الخط الزمني للـ events">
      {events.map((e) => {
        const from = e.start ?? e.added;
        const to = e.end ?? now;
        const c = COLORS[e.late ? "done" : e.status];
        return (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "34px 1fr 64px", gap: 8, alignItems: "center", fontSize: 13 }}>
            <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "var(--muted)" }}>#{e.id}</span>
            <div style={{ position: "relative", height: 16, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
              {e.start !== undefined && e.start > e.added && (
                <span style={{ position: "absolute", top: 6, height: 3, left: pct(e.added), width: `calc(${pct(e.start)} - ${pct(e.added)})`, background: "var(--line)" }} />
              )}
              {e.status === "queued" && (
                <span style={{ position: "absolute", top: 6, height: 3, left: pct(e.added), width: `calc(${pct(now)} - ${pct(e.added)})`, background: "var(--line)" }} />
              )}
              {e.status !== "queued" && (
                <span style={{
                  position: "absolute", top: 2, bottom: 2, borderRadius: 4, left: pct(from),
                  width: `max(4px, calc(${pct(to)} - ${pct(from)}))`, background: c.bg,
                  outline: e.late ? "2px solid var(--warn)" : undefined,
                }} />
              )}
            </div>
            <span dir="rtl" style={{ color: e.late ? "var(--warn)" : "var(--ink)", fontWeight: e.late ? 600 : 400 }}>
              {e.late ? "emit متأخر" : c.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
