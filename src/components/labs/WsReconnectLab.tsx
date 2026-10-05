"use client";
import { useState } from "react";
import Switch from "./Switch";

const MONO = "IBM Plex Mono, monospace";
const DROP = 10; // second at which the incident happens
const UPGRADE = 0.3; // seconds an upgrade (or a failed attempt) takes
const REFRESH = 0.4;
const PING = 25;

type Scenario = "1001" | "4401" | "4426" | "silent";
type RefreshResult = "ok" | "null" | "again";
type Status = "connecting" | "connected" | "waiting" | "refresh" | "halfopen" | "stopped";
type Seg = { from: number; to: number; s: Status };
type Mark = { t: number; label: string; color: string };
type Line = { t: number; kind: "ok" | "bad" | "req" | "cancel" | "drop" | "key"; text: React.ReactNode };

type Cfg = { scenario: Scenario; refresh: RefreshResult; serverDown: number; tunnel: number; jitter: boolean; heartbeat: boolean; onOnline: boolean };

const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "1001", label: "1001", hint: "السيرفر عمل deploy وقفل الاتصالات (Going Away)" },
  { id: "4401", label: "4401", hint: "الـ token اللي الاتصال اتفتح بيه خلص" },
  { id: "4426", label: "4426", hint: "نسخة الـ app قديمة: لازم update" },
  { id: "silent", label: "من غير close frame", hint: "الموبايل دخل نفق: الاتصال مات ومحدش قال" },
];

/** Deterministic PRNG, so the server render and the first client render match. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sec = (t: number) => `${t.toFixed(1)}s`;

function simulate(c: Cfg, seed: number) {
  const rng = mulberry32(seed);
  const segs: Seg[] = [];
  const marks: Mark[] = [];
  const log: Line[] = [];
  let attempt = 0; // Backoff._attempt
  let attempts = 0; // connection attempts after the incident
  let recoveredAt: number | null = null;
  let stoppedAt: number | null = null;

  const next = () => {
    const cap = Math.min(1 * 2 ** Math.min(attempt, 20), 30);
    attempt++;
    return cap / 2 + (cap / 2) * (c.jitter ? rng() : 1);
  };
  const seg = (from: number, to: number, s: Status) => segs.push({ from, to, s });
  const netUp = (t: number) => c.scenario !== "silent" || t < DROP || t >= DROP + c.tunnel;
  const serverUp = (t: number) => c.scenario !== "1001" || t < DROP || t >= DROP + c.serverDown;
  const netBack = DROP + c.tunnel;

  seg(0, UPGRADE, "connecting");
  log.push({ t: UPGRADE, kind: "ok", text: <>الـ <code>hello</code> وصل: <code>connected</code></> });

  /** _retryIn(wait) and the attempts after it, until one gets through. */
  function retryLoop(from: number, wait: number) {
    let t = from;
    for (let guard = 0; guard < 30; guard++) {
      let fireAt = t + wait;
      log.push({ t, kind: "cancel", text: <><code>_retryIn</code>: المحاولة {attempt} بعد {wait.toFixed(2)} ثانية</> });
      if (c.scenario === "silent" && c.onOnline && netBack > t && netBack < fireAt) {
        seg(t, netBack, "waiting");
        marks.push({ t: netBack, label: "onOnline", color: "var(--accent)" });
        log.push({ t: netBack, kind: "key", text: <><code>onOnline</code> → <code>_retryNow</code>: بيحاول دلوقتي، والعداد فاضل {attempt}</> });
        fireAt = netBack;
      } else seg(t, fireAt, "waiting");
      attempts++;
      seg(fireAt, fireAt + UPGRADE, "connecting");
      if (netUp(fireAt) && serverUp(fireAt)) {
        recoveredAt = fireAt + UPGRADE;
        log.push({ t: recoveredAt, kind: "ok", text: <>اتوصل تاني: <code>hello</code>، والـ <code>LiveSyncService</code> بيعمل catch-up للي فاته</> });
        return;
      }
      log.push({ t: fireAt + UPGRADE, kind: "bad", text: <>المحاولة فشلت: {netUp(fireAt) ? "السيرفر الجديد لسه مش جاهز" : "مفيش نت"}</> });
      t = fireAt + UPGRADE;
      wait = next();
    }
  }

  /** _onClosed: the close code decides. */
  function onClosed(t: number, code: string, connectedAt: number) {
    const lived = t - connectedAt;
    if (lived > 30) {
      attempt = 0;
      log.push({ t, kind: "key", text: <>الاتصال عاش {Math.round(lived)} ثانية (أكتر من 30): <code>_backoff.reset()</code></> });
    }
    marks.push({ t, label: code, color: "var(--warn)" });
    return lived;
  }

  if (c.scenario === "1001") {
    seg(UPGRADE, DROP, "connected");
    onClosed(DROP, "1001", UPGRADE);
    log.push({ t: DROP, kind: "bad", text: <>السيرفر قفل بـ <code>1001</code> (deploy). الـ <code>default</code> في الـ switch: استنى وحاول</> });
    retryLoop(DROP, next());
  } else if (c.scenario === "4426") {
    seg(UPGRADE, DROP, "connected");
    onClosed(DROP, "4426", UPGRADE);
    log.push({ t: DROP, kind: "bad", text: <><code>4426</code>: <code>UpdateRequired</code> راح للـ <code>AppStatusCubit</code> (نفس alert الـ 426)، و<code>_giveUp</code></> });
    stoppedAt = DROP;
  } else if (c.scenario === "4401") {
    seg(UPGRADE, DROP, "connected");
    onClosed(DROP, "4401", UPGRADE);
    log.push({ t: DROP, kind: "bad", text: <><code>4401</code>: الـ token خلص. <code>_reauth</code>، و<code>_authFailures</code> بقى 1</> });
    seg(DROP, DROP + REFRESH, "refresh");
    marks.push({ t: DROP + REFRESH, label: "refresh", color: "var(--deep)" });
    const t1 = DROP + REFRESH;
    if (c.refresh === "null") {
      log.push({ t: t1, kind: "bad", text: <><code>TokenRefresher.refresh()</code> رجّع null: السيرفر رفض الـ refresh token والـ tokens اتمسحت. <code>_giveUp</code>، والـ AuthCubit بيوصل لـ <code>sessionExpired</code></> });
      stoppedAt = t1;
    } else {
      log.push({ t: t1, kind: "ok", text: <>الـ refresh رجّع token جديد (نفس الـ <code>TokenRefresher</code> بتاع الـ interceptor): <code>_open()</code> على طول من غير backoff</> });
      attempts++;
      seg(t1, t1 + UPGRADE, "connecting");
      if (c.refresh === "ok") {
        recoveredAt = t1 + UPGRADE;
        log.push({ t: recoveredAt, kind: "ok", text: <><code>hello</code> وصل: <code>_authFailures = 0</code></> });
      } else {
        const t2 = t1 + UPGRADE;
        marks.push({ t: t2, label: "4401", color: "var(--warn)" });
        log.push({ t: t2, kind: "bad", text: <>السيرفر قبل الـ upgrade وقفل بـ <code>4401</code> تاني قبل الـ hello. <code>_authFailures</code> بقى 2: <code>_giveUp(&apos;4401 again right after a refresh&apos;)</code>. ده bug في السيرفر، مش token</> });
        stoppedAt = t2;
      }
    }
  } else {
    // silent death: no close frame, the app still thinks it's connected
    seg(UPGRADE, DROP, "connected");
    marks.push({ t: DROP, label: "نفق", color: "var(--muted)" });
    log.push({ t: DROP, kind: "drop", text: <>الموبايل دخل نفق. مفيش close frame ولا error: الحالة لسه <code>connected</code>، والـ events بتضيع</> });
    if (!c.heartbeat) {
      seg(DROP, 120, "halfopen");
      log.push({ t: DROP + 0.1, kind: "bad", text: <>من غير <code>pingInterval</code> مفيش حاجة هتكتشف إن الاتصال مات. الـ app هيفضل فاكر نفسه متصل لحد ما يروح الخلفية</> });
    } else {
      // dart:io pings every interval; no pong within the next interval closes with 1001
      let detected = 0;
      for (let p = UPGRADE + PING; p < 200; p += PING) {
        const lost = p >= DROP;
        marks.push({ t: p, label: lost ? "ping ✗" : "ping", color: lost ? "var(--warn)" : "var(--good)" });
        if (lost) {
          detected = p + PING;
          log.push({ t: p, kind: "cancel", text: <>ping راح ومارجعش pong</> });
          break;
        }
        log.push({ t: p, kind: "ok", text: <>ping وpong: الاتصال عايش</> });
      }
      seg(DROP, detected, "halfopen");
      onClosed(detected, "1001", UPGRADE);
      log.push({ t: detected, kind: "bad", text: <>مفيش pong في interval كامل: <code>dart:io</code> قفل بـ <code>1001</code> بعد {Math.round(detected - DROP)} ثانية من موت الاتصال</> });
      retryLoop(detected, next());
    }
    const deadUntil = c.heartbeat ? UPGRADE + 2 * PING : Infinity;
    if (netBack < deadUntil && netBack < 120) {
      marks.push({ t: netBack, label: "النت رجع", color: "var(--good)" });
      if (c.onOnline) log.push({ t: netBack, kind: "cancel", text: <><code>onOnline</code> اشتغل، بس الحالة لسه <code>connected</code>، فالـ <code>_retryNow</code> مابيعملش حاجة. الاتصال ميت ومحدش عارف</> });
    } else if (!marks.some((m) => m.label === "onOnline") && netBack < 120) marks.push({ t: netBack, label: "النت رجع", color: "var(--good)" });
  }

  const endAt = recoveredAt ?? stoppedAt ?? (c.scenario === "silent" && !c.heartbeat ? 90 : 120);
  const total = Math.min(130, Math.max(40, Math.ceil((endAt + 8) / 10) * 10));
  if (recoveredAt !== null) seg(recoveredAt, total, "connected");
  if (stoppedAt !== null) seg(stoppedAt, total, "stopped");
  const visible = segs.filter((s) => s.from < total).map((s) => ({ ...s, to: Math.min(s.to, total) }));
  log.sort((a, b) => a.t - b.t);
  return { segs: visible, marks: marks.filter((m) => m.t <= total), log, total, attempts, recoveredAt, stoppedAt };
}

const STYLE: Record<Status, { bg: string; label: string }> = {
  connecting: { bg: "var(--accent)", label: "connecting" },
  connected: { bg: "var(--good)", label: "connected" },
  waiting: { bg: "var(--line)", label: "waiting" },
  refresh: { bg: "var(--deep)", label: "refresh" },
  halfopen: { bg: "var(--warn-soft)", label: "connected (ميت)" },
  stopped: { bg: "var(--muted)", label: "stopped" },
};

function Herd({ jitter }: { jitter: boolean }) {
  // 40,000 phones dropped at the same second; where does their first attempt land? (100ms buckets)
  const buckets = Array.from({ length: 12 }, (_, i) => i / 10 + 0.1);
  const share = (b: number) => (jitter ? (b > 0.5 && b <= 1.0 + 1e-9 ? 0.2 : 0) : Math.abs(b - 1.0) < 1e-9 ? 1 : 0);
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "8px 12px", margin: "10px 0" }}>
      <small style={{ color: "var(--muted)" }}>40 ألف موبايل اتقطعوا في نفس الثانية: أول محاولة بتاعتهم بتقع فين (كل عمود 100ms)</small>
      <div dir="ltr" style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70, marginTop: 6 }}>
        {buckets.map((b) => (
          <div key={b} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ height: `${share(b) * 100}%`, minHeight: 1, background: share(b) === 1 ? "var(--warn)" : "var(--accent)", borderRadius: "3px 3px 0 0" }} />
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--muted)", textAlign: "center" }}>{b.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <small style={{ color: jitter ? "var(--good)" : "var(--warn)", fontWeight: 600 }}>
        {jitter ? "حوالي 8 آلاف upgrade في كل 100ms بين 0.5 و1 ثانية: السيرفر الجديد يستحملهم." : "الـ 40 ألف upgrade في نفس اللحظة بالظبط بعد ثانية، وبعدين بعد ثانيتين، في موجات."}
      </small>
    </div>
  );
}

export default function WsReconnectLab() {
  const [c, setC] = useState<Cfg>({ scenario: "1001", refresh: "ok", serverDown: 5, tunnel: 70, jitter: true, heartbeat: true, onOnline: true });
  const [seed, setSeed] = useState(7);
  const set = <K extends keyof Cfg>(k: K) => (v: Cfg[K]) => setC((x) => ({ ...x, [k]: v }));
  const r = simulate(c, seed);
  const pct = (t: number) => `${(t / r.total) * 100}%`;
  // markers that would overlap go one row up
  let prev = -Infinity;
  let lastRow = 1;
  const rows = [...r.marks].sort((a, b) => a.t - b.t).map((m) => {
    const row = (m.t - prev) / r.total < 0.16 ? 1 - lastRow : 0;
    prev = m.t;
    lastRow = row;
    return { m, row };
  });
  const ticks = Array.from({ length: Math.floor(r.total / 10) + 1 }, (_, i) => i * 10);
  const chip = <T extends string | number>(cur: T, val: T, label: React.ReactNode, on: (v: T) => void) => (
    <button key={String(val)} type="button" role="radio" aria-checked={cur === val} className={`chip-btn${cur === val ? " active" : ""}`} onClick={() => on(val)}>{label}</button>
  );
  const final = r.stoppedAt !== null ? "stopped" : r.recoveredAt !== null ? "connected" : c.scenario === "silent" && !c.heartbeat ? "connected (ميت)" : "waiting";

  return (
    <section className="lab">
      <h2>الـ reconnect على خط زمني</h2>
      <p>الاتصال بيبدأ <code>connected</code>، وعند الثانية {DROP} بيحصل حاجة. اختار هي إيه، وشوف الـ <code>RealtimeClient</code> بيعمل إيه ثانية بثانية. الـ jitter عشوائي: دوس «عشوائي تاني» كذا مرة وبص على الانتظار.</p>
      <div className="lab-controls" role="radiogroup" aria-label="الـ close code">
        {SCENARIOS.map((s) => chip(c.scenario, s.id, <span dir="ltr">{s.label}</span>, set("scenario")))}
      </div>
      <p className="lab-hint" style={{ marginTop: 0 }}>{SCENARIOS.find((s) => s.id === c.scenario)!.hint}</p>

      <div className="lab-controls">
        {c.scenario === "1001" && <div role="radiogroup" aria-label="السيرفر الجديد جاهز بعد" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <small style={{ color: "var(--muted)" }}>السيرفر الجديد جاهز بعد:</small>
          {[0, 5, 20].map((v) => chip(c.serverDown, v, `${v} ث`, set("serverDown")))}
        </div>}
        {c.scenario === "4401" && <div role="radiogroup" aria-label="نتيجة الـ refresh" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <small style={{ color: "var(--muted)" }}>الـ refresh:</small>
          {chip(c.refresh, "ok", "token جديد", set("refresh"))}
          {chip(c.refresh, "null", "رجّع null", set("refresh"))}
          {chip(c.refresh, "again", "4401 تاني بعده", set("refresh"))}
        </div>}
        {c.scenario === "silent" && <div role="radiogroup" aria-label="مدة النفق" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <small style={{ color: "var(--muted)" }}>النت راجع بعد:</small>
          {[20, 70].map((v) => chip(c.tunnel, v, `${v} ث`, set("tunnel")))}
        </div>}
      </div>
      <div className="lab-controls">
        <Switch checked={c.jitter} onChange={set("jitter")}>equal jitter</Switch>
        {c.scenario === "silent" && <Switch checked={c.heartbeat} onChange={set("heartbeat")}><code>pingInterval: 25s</code></Switch>}
        {c.scenario === "silent" && <Switch checked={c.onOnline} onChange={set("onOnline")}><code>onOnline</code> → <code>_retryNow</code></Switch>}
        <button className="btn ghost" type="button" onClick={() => setSeed((s) => s + 1)} disabled={!c.jitter}>عشوائي تاني</button>
      </div>

      <div dir="ltr" style={{ margin: "14px 0 6px" }} aria-label="الخط الزمني للاتصال">
        <div style={{ position: "relative", height: 36 }}>
          {rows.map(({ m, row }, i) => (
            <span key={i} title={`${sec(m.t)}: ${m.label}`} style={{ position: "absolute", left: pct(m.t), bottom: 0, transform: "translateX(-50%)", fontSize: 10.5, fontFamily: MONO, color: m.color, whiteSpace: "nowrap", lineHeight: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {m.label}
              <span style={{ display: "block", width: 1, height: row ? 18 : 5, background: m.color, marginTop: 2 }} />
            </span>
          ))}
        </div>
        <div style={{ position: "relative", height: 24, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
          {r.segs.map((s, i) => (
            <span key={i} title={`${STYLE[s.s].label}: ${sec(s.from)} → ${sec(s.to)}`} style={{
              position: "absolute", top: 2, bottom: 2, left: pct(s.from), width: `max(2px, calc(${pct(s.to)} - ${pct(s.from)}))`,
              background: STYLE[s.s].bg, borderRadius: 3,
              border: s.s === "halfopen" ? "1px dashed var(--warn)" : undefined,
            }} />
          ))}
        </div>
        <div style={{ position: "relative", height: 16, fontSize: 10, fontFamily: MONO, color: "var(--muted)" }}>
          {ticks.map((t) => <span key={t} style={{ position: "absolute", left: pct(t), transform: t === 0 ? undefined : t === r.total ? "translateX(-100%)" : "translateX(-50%)" }}>{t}s</span>)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 12, marginTop: 4 }}>
          {(Object.keys(STYLE) as Status[]).map((k) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 10, borderRadius: 2, background: STYLE[k].bg, border: k === "halfopen" ? "1px dashed var(--warn)" : undefined }} />{STYLE[k].label}
            </span>
          ))}
        </div>
      </div>

      <div className="lab-stats">
        <div><b dir="ltr">{final}</b><small>الحالة في الآخر</small></div>
        <div><b>{r.attempts}</b><small>محاولات بعد المشكلة</small></div>
        <div><b dir="ltr">{r.recoveredAt !== null ? sec(r.recoveredAt - DROP) : "—"}</b><small>لحد ما رجع</small></div>
      </div>
      {c.scenario === "silent" && !c.heartbeat && <div className="lab-warn">الـ half-open connection: الطرفين فاكرين إن الاتصال مفتوح، والسيرفر بيبعت events في الفراغ.</div>}
      {c.scenario === "4401" && c.refresh === "again" && <div className="lab-warn">من غير <code>_authFailures</code>، الـ loop ده كان هيضرب <code>/auth/refresh</code> كل ثانية لحد ما ياخد rate limit.</div>}
      {c.scenario === "1001" && <Herd jitter={c.jitter} />}

      <ol className="sim-log" aria-live="polite">
        {r.log.map((l, i) => <li key={i} className={l.kind}><span className="t">{sec(l.t)}</span> {l.text}</li>)}
      </ol>
    </section>
  );
}
