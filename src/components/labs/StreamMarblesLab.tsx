"use client";
import { useEffect, useRef, useState } from "react";
import { Log, useLog } from "./useLog";

type AsyncOp = "asyncMap" | "switchMap" | "exhaustMap";
type Marble = { id: number; t: number; label: string };
type ReqStatus = "queued" | "running" | "done" | "cancelled" | "dropped";
type Req = { id: number; q: string; added: number; start?: number; end?: number; status: ReqStatus; ms: number };

const OPS: { op: AsyncOp; hint: string }[] = [
  { op: "asyncMap", hint: "كل بحث بيستنى اللي قبله يخلص، وكل النتايج بتتعرض بالترتيب، حتى القديمة" },
  { op: "switchMap", hint: "أي بحث جديد بيلغي الـ subscription على اللي شغال: آخر واحد بس هو اللي نتيجته توصل" },
  { op: "exhaustMap", hint: "طول ما في بحث شغال، أي بحث جديد بيترمي" },
];

const DEBOUNCE = 350;
const THROTTLE = 350;
const MAX_REQS = 8;
/** Short queries are slower on purpose, like a server scanning more results. */
const latency = (q: string) => Math.max(300, 2400 - q.length * 260);
/** "flu", a pause long enough to fire a search, then "tter": the case that breaks asyncMap. */
const DEMO: [string, number][] = [["f", 0], ["fl", 140], ["flu", 140], ["flut", 700], ["flutt", 140], ["flutte", 140], ["flutter", 140]];

export default function StreamMarblesLab() {
  const [op, setOp] = useState<AsyncOp>("switchMap");
  const [value, setValue] = useState("");
  const [source, setSource] = useState<Marble[]>([]);
  const [distinct, setDistinct] = useState<Marble[]>([]);
  const [debounced, setDebounced] = useState<Marble[]>([]);
  const [throttled, setThrottled] = useState<Marble[]>([]);
  const [results, setResults] = useState<Marble[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [shown, setShown] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [demo, setDemo] = useState(false);
  const [trackW, setTrackW] = useState(600);
  const lanesRef = useRef<HTMLDivElement>(null);
  const { lines, add, reset: resetLog } = useLog();

  const t0 = useRef<number | null>(null);
  const seq = useRef(0);
  const lastDistinct = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gate = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reqsRef = useRef<Req[]>([]);
  const lastActivity = useRef(0);
  const opRef = useRef(op); opRef.current = op;

  const elapsed = () => (t0.current === null ? 0 : Date.now() - t0.current);
  const mark = (label: string): Marble => ({ id: seq.current++, t: elapsed(), label });
  const touch = () => { lastActivity.current = elapsed(); setNow(elapsed()); };

  const commitReqs = () => setReqs([...reqsRef.current]);
  const patchReq = (id: number, p: Partial<Req>) => {
    reqsRef.current = reqsRef.current.map((r) => (r.id === id ? { ...r, ...p } : r));
    commitReqs();
  };

  const active = reqs.some((r) => r.status === "running" || r.status === "queued") || demo || now - lastActivity.current < 1200;
  useEffect(() => {
    if (!active || t0.current === null) return;
    const h = setInterval(() => setNow(elapsed()), 60);
    return () => clearInterval(h);
  }, [active]);

  useEffect(() => () => clearAll(), []);
  useEffect(() => {
    const el = lanesRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTrackW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function clearAll() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (gate.current) clearTimeout(gate.current);
    reqTimers.current.forEach(clearTimeout);
    reqTimers.current.clear();
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    debounceTimer.current = null;
    gate.current = null;
  }

  // ---- the async stage ----
  function start(r: Req) {
    patchReq(r.id, { status: "running", start: elapsed() });
    add("req", <>بحث #{r.id} بدأ: <code>{r.q}</code> وهياخد {r.ms}ms</>);
    reqTimers.current.set(r.id, setTimeout(() => finish(r.id), r.ms));
  }

  function finish(id: number) {
    reqTimers.current.delete(id);
    const r = reqsRef.current.find((x) => x.id === id);
    if (!r) return;
    patchReq(id, { status: "done", end: elapsed() });
    setResults((rs) => [...rs, mark(r.q)]);
    setShown(r.q);
    const newest = reqsRef.current[reqsRef.current.length - 1];
    if (newest && newest.id !== id) add("bad", <>نتيجة <code>{r.q}</code> اتعرضت، والمستخدم كاتب <code>{newest.q}</code> من بدري</>);
    else add("ok", <>نتيجة <code>{r.q}</code> وصلت للشاشة</>);
    touch();
    if (opRef.current === "asyncMap") {
      const next = reqsRef.current.find((x) => x.status === "queued");
      if (next) start(next);
    }
  }

  function search(q: string) {
    const id = (reqsRef.current[reqsRef.current.length - 1]?.id ?? 0) + 1;
    const r: Req = { id, q, added: elapsed(), status: "queued", ms: latency(q) };
    reqsRef.current = [...reqsRef.current, r].slice(-MAX_REQS);
    commitReqs();
    const running = reqsRef.current.filter((x) => x.status === "running");
    switch (opRef.current) {
      case "asyncMap":
        if (running.length || reqsRef.current.some((x) => x.status === "queued" && x.id !== id)) {
          add("cancel", <>بحث #{id} <code>{q}</code> مستني دوره في الطابور</>);
        } else start(r);
        break;
      case "switchMap":
        for (const x of running) {
          clearTimeout(reqTimers.current.get(x.id));
          reqTimers.current.delete(x.id);
          patchReq(x.id, { status: "cancelled", end: elapsed() });
          add("cancel", <>بحث #{x.id} <code>{x.q}</code> اتلغى. الطلب نفسه كمّل على السيرفر ونتيجته اترمت</>);
        }
        start(r);
        break;
      case "exhaustMap":
        if (running.length) {
          patchReq(id, { status: "dropped", end: elapsed() });
          add("drop", <>بحث #{id} <code>{q}</code> اترمى: في بحث لسه شغال</>);
        } else start(r);
        break;
    }
  }

  // ---- the sync stages ----
  function onInput(raw: string) {
    if (t0.current === null) t0.current = Date.now();
    setValue(raw);
    setSource((s) => [...s, mark(raw)]);
    touch();
    const q = raw.trim();
    if (q.length < 2 || q === lastDistinct.current) return; // where + distinct
    lastDistinct.current = q;
    setDistinct((s) => [...s, mark(q)]);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      setDebounced((s) => [...s, mark(q)]);
      add("key", <>الـ debounce عدّى <code>{q}</code> بعد {DEBOUNCE}ms سكوت</>);
      touch();
      search(q);
    }, DEBOUNCE);

    if (!gate.current) {
      setThrottled((s) => [...s, mark(q)]);
      gate.current = setTimeout(() => { gate.current = null; }, THROTTLE);
    }
  }

  function restart(next: AsyncOp = op) {
    clearAll();
    t0.current = null; seq.current = 0; lastDistinct.current = null; reqsRef.current = []; lastActivity.current = 0;
    setValue(""); setSource([]); setDistinct([]); setDebounced([]); setThrottled([]); setResults([]); setReqs([]);
    setShown(null); setNow(0); setDemo(false); setOp(next); resetLog();
  }

  function runDemo() {
    restart();
    setDemo(true);
    let at = 0;
    DEMO.forEach(([text, gap], i) => {
      at += gap;
      demoTimers.current.push(setTimeout(() => {
        onInput(text);
        if (i === DEMO.length - 1) setDemo(false);
      }, at + 50));
    });
  }

  const span = Math.max(5000, now + 500);
  const minGap = Math.min(0.5, 52 / Math.max(120, trackW * 0.96)); // fraction of the timeline a label needs
  const pct = (ms: number) => `${2 + Math.min(96, (ms / span) * 96)}%`;
  const idle = !reqs.some((r) => r.status === "running" || r.status === "queued") && !debounceTimer.current;
  const latest = lastDistinct.current;
  const stale = idle && shown !== null && latest !== null && shown !== latest;
  const sent = reqs.length;

  return (
    <section className="lab">
      <h2>الـ operators على خط زمني</h2>
      <p>اكتب في الخانة، وكل حرف هيظهر كدايرة على خط الـ source. تحته كل operator بيطلّع إيه من نفس الكتابة. وآخر خطين: البحث نفسه بيمر بأنهي operator. الطلبات القصيرة أبطأ عن قصد. دوس «اكتب flutter لوحدك» مع كل operator، وقارن الشاشة بتعرض إيه في الآخر.</p>

      <div className="lab-controls" role="radiogroup" aria-label="operator البحث">
        {OPS.map((o) => (
          <button key={o.op} type="button" role="radio" aria-checked={op === o.op}
            className={`chip-btn${op === o.op ? " active" : ""}`} onClick={() => restart(o.op)} dir="ltr">
            {o.op}
          </button>
        ))}
      </div>
      <p className="lab-hint" style={{ marginTop: 0 }}>{OPS.find((o) => o.op === op)!.hint}</p>

      <div className="lab-controls">
        <input className="lab-input" dir="ltr" placeholder="flutter" autoComplete="off" spellCheck={false} disabled={demo}
          aria-label="خانة البحث" value={value} onChange={(e) => onInput(e.target.value)} style={{ fontFamily: "IBM Plex Mono, monospace" }} />
        <button className="btn" type="button" onClick={runDemo} disabled={demo}>اكتب flutter لوحدك</button>
        <button className="btn ghost" type="button" onClick={() => restart()}>ابدأ من جديد</button>
      </div>

      <div className="lab-stats">
        <div><b>{source.length}</b><small>أحداث في الـ source</small></div>
        <div><b>{sent}</b><small>عمليات بحث بدأت</small></div>
        <div><b>{reqs.filter((r) => r.status === "cancelled" || r.status === "dropped").length}</b><small>اتلغت أو اترمت</small></div>
        <div><b dir="ltr">{shown ?? "—"}</b><small>الشاشة بتعرض نتايج</small></div>
      </div>
      {stale && <div className="lab-warn">الشاشة بتعرض نتايج <span dir="ltr">«{shown}»</span> والمستخدم كاتب <span dir="ltr">«{latest}»</span>.</div>}

      <div ref={lanesRef} dir="ltr" style={{ display: "grid", gap: 6, margin: "14px 0" }} aria-label="الخط الزمني للـ operators">
        <Lane name="source" marbles={source} pct={pct} span={span} minGap={minGap} dots />
        <Lane name="trim · where · distinct" marbles={distinct} pct={pct} span={span} minGap={minGap} />
        <Lane name={`debounce(${DEBOUNCE}ms)`} marbles={debounced} pct={pct} span={span} minGap={minGap} color="var(--accent)" />
        <Lane name={`throttle(${THROTTLE}ms)`} marbles={throttled} pct={pct} span={span} minGap={minGap} color="var(--deep)" note="instead of debounce" />
        <ReqLane name={op} reqs={reqs} pct={pct} now={now} />
        <Lane name="→ emit" marbles={results} pct={pct} span={span} minGap={minGap} color="var(--good)" />
      </div>
      <p className="lab-hint">البحث بيمشي ورا الـ debounce بس. خط الـ throttle للمقارنة: نفس الكتابة لو كانت عدّت على throttle بدل debounce.</p>

      <Log lines={lines} />
    </section>
  );
}

const ROW: React.CSSProperties = { display: "grid", gap: 2, fontSize: 12 }; // name above the track: the track gets the full width on phones
const TRACK: React.CSSProperties = { position: "relative", height: 30, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" };
const NAME: React.CSSProperties = { fontFamily: "IBM Plex Mono, monospace", color: "var(--muted)", lineHeight: 1.3, fontSize: 11.5 };

function Lane({ name, marbles, pct, span, minGap, color = "var(--ink)", dots = false, note }: {
  name: string; marbles: Marble[]; pct: (ms: number) => string; span: number; minGap: number; color?: string; dots?: boolean; note?: string;
}) {
  // a label only when there is room for it: the last marble of a burst keeps its label
  const labeled = new Set<number>();
  let nextT = Infinity;
  for (let i = marbles.length - 1; i >= 0; i--) {
    if ((nextT - marbles[i].t) / span > minGap) { labeled.add(marbles[i].id); nextT = marbles[i].t; }
  }
  return (
    <div style={ROW}>
      <span style={NAME}>{name}{note && <small style={{ fontSize: 10.5 }}> · {note}</small>}</span>
      <div style={TRACK}>
        <span style={{ position: "absolute", left: 0, right: 0, top: 14, height: 1, background: "var(--line)" }} />
        {marbles.map((m) => (
          <span key={m.id} title={m.label} style={{ position: "absolute", left: pct(m.t), top: dots ? 10 : 3, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ width: dots ? 9 : 12, height: dots ? 9 : 12, borderRadius: "50%", background: dots ? "var(--surface)" : color, border: `2px solid ${color}` }} />
            {!dots && labeled.has(m.id) && <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9.5, lineHeight: 1.1, color: "var(--ink)", whiteSpace: "nowrap" }}>{m.label}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

const REQ_COLORS: Record<ReqStatus, string> = {
  queued: "var(--line)",
  running: "var(--accent)",
  done: "var(--good)",
  cancelled: "var(--muted)",
  dropped: "var(--deep)",
};

function ReqLane({ name, reqs, pct, now }: { name: string; reqs: Req[]; pct: (ms: number) => string; now: number }) {
  return (
    <div style={ROW}>
      <span style={NAME}>{name}(search) <small style={{ fontSize: 10.5 }}>· requests</small></span>
      <div style={{ ...TRACK, height: Math.max(30, reqs.length * 9 + 8) }}>
        {reqs.map((r, i) => {
          const from = r.start ?? r.added;
          const to = r.end ?? now;
          const top = 4 + i * 9;
          return (
            <span key={r.id} title={`#${r.id} ${r.q}: ${r.status}`}>
              {(r.status === "queued" || (r.start !== undefined && r.start > r.added)) && (
                <span style={{ position: "absolute", top: top + 3, height: 2, left: pct(r.added), width: `calc(${pct(r.start ?? now)} - ${pct(r.added)})`, background: "var(--line)" }} />
              )}
              {r.status !== "queued" && (
                <span style={{
                  position: "absolute", top, height: 7, borderRadius: 3, left: pct(from),
                  width: `max(4px, calc(${pct(to)} - ${pct(from)}))`, background: REQ_COLORS[r.status],
                  opacity: r.status === "cancelled" ? 0.6 : 1,
                }} />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
