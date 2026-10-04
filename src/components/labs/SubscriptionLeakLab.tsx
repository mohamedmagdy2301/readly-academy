"use client";
import { useEffect, useRef, useState } from "react";
import { Log, useLog } from "./useLog";
import Switch from "./Switch";

type Screen = { id: number; open: boolean; subscribed: boolean; pending: number; emits: number; errors: number };

const MAX_SCREENS = 8;
const CALLBACK_MS = 900;

export default function SubscriptionLeakLab() {
  const [cancelInClose, setCancelInClose] = useState(false);
  const [asyncCallback, setAsyncCallback] = useState(false);
  const [isClosedCheck, setIsClosedCheck] = useState(false);
  const [auto, setAuto] = useState(false);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [events, setEvents] = useState(0);
  const { lines, add, reset: resetLog } = useLog();

  const list = useRef<Screen[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const opts = useRef({ cancelInClose, asyncCallback, isClosedCheck });
  opts.current = { cancelInClose, asyncCallback, isClosedCheck };

  const commit = () => setScreens(list.current.map((s) => ({ ...s })));
  const find = (id: number) => list.current.find((s) => s.id === id);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!auto) return;
    const h = setInterval(() => emitFromSource(), 1200);
    return () => clearInterval(h);
  }, [auto]);

  function open() {
    const id = ++seq.current;
    list.current = [...list.current, { id, open: true, subscribed: true, pending: 0, emits: 0, errors: 0 }].slice(-MAX_SCREENS);
    commit();
    add("key", <>صفحة كتاب #{id} اتفتحت: الـ BookDetailsCubit عمل <code>listen</code> على <code>onEnqueued</code></>);
  }

  function close() {
    const s = [...list.current].reverse().find((x) => x.open);
    if (!s) return;
    s.open = false;
    if (opts.current.cancelInClose) {
      s.subscribed = false;
      add("cancel", <>صفحة #{s.id} اتقفلت: <code>close()</code> عمل cancel للـ subscription</>);
      if (s.pending) add("cancel", <>بس في {s.pending} callback لسه مستني الـ await جواه. الـ cancel مابيوقفوش</>);
    } else {
      add("drop", <>صفحة #{s.id} اتقفلت، والـ subscription لسه عايشة: الـ SyncQueue ماسك الـ Cubit في الذاكرة</>);
    }
    commit();
  }

  function deliver(id: number) {
    const s = find(id);
    if (!s) return;
    if (s.open) {
      s.emits++;
      add("ok", <>Cubit #{id} عمل emit</>);
    } else if (opts.current.isClosedCheck) {
      add("cancel", <>Cubit #{id} مقفول: <code>isClosed</code> منع الـ emit. الخطأ اختفى، بس الـ Cubit لسه في الذاكرة لو الـ subscription عايشة</>);
    } else {
      s.errors++;
      add("bad", <>Cubit #{id}: StateError: Cannot emit new states after calling close</>);
    }
    commit();
  }

  function emitFromSource() {
    setEvents((n) => n + 1);
    const targets = list.current.filter((s) => s.subscribed);
    add("req", <>الـ SyncQueue طلّع حدث، ووصل لـ {targets.length} subscription</>);
    for (const s of targets) {
      if (opts.current.asyncCallback) {
        s.pending++;
        const h = setTimeout(() => {
          timers.current.delete(h);
          const cur = find(s.id);
          if (cur) cur.pending--;
          deliver(s.id);
        }, CALLBACK_MS);
        timers.current.add(h);
      } else deliver(s.id);
    }
    commit();
  }

  function restart() {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    list.current = []; seq.current = 0;
    setScreens([]); setEvents(0); setAuto(false); resetLog();
  }

  const openCount = screens.filter((s) => s.open).length;
  const subs = screens.filter((s) => s.subscribed).length;
  const leaked = screens.filter((s) => !s.open && (s.subscribed || s.pending > 0)).length;
  const errors = screens.reduce((n, s) => n + s.errors, 0);

  return (
    <section className="lab">
      <h2>الـ subscription اللي محدش لغاها</h2>
      <p>الـ SyncQueue عايش طول عمر الـ app، وكل صفحة كتاب بتفتحها بتعمل Cubit بيسمع عليه. افتح 3 صفحات واقفلهم، وبعدين ابعت أحداث. بعد كده شغّل الـ <code>cancel()</code> في <code>close()</code> وجرّب تاني، وبعدين جرّب الـ callback اللي فيه await.</p>
      <div className="lab-controls">
        <Switch checked={cancelInClose} onChange={setCancelInClose}><code>cancel()</code> في <code>close()</code></Switch>
        <Switch checked={asyncCallback} onChange={setAsyncCallback}>callback فيه <code>await</code> قبل الـ <code>emit</code></Switch>
        <Switch checked={isClosedCheck} onChange={setIsClosedCheck}><code>if (isClosed) return</code></Switch>
      </div>
      <div className="lab-controls">
        <button className="btn" type="button" onClick={open}>افتح صفحة كتاب</button>
        <button className="btn ghost" type="button" onClick={close} disabled={!openCount}>اقفل آخر صفحة</button>
        <button className="btn ghost" type="button" onClick={emitFromSource}>حدث من الـ SyncQueue</button>
        <Switch checked={auto} onChange={setAuto}>حدث كل 1.2 ثانية</Switch>
        <button className="btn ghost" type="button" onClick={restart}>ابدأ من جديد</button>
      </div>

      <div className="lab-stats">
        <div><b>{openCount}</b><small>صفحات مفتوحة</small></div>
        <div><b>{subs}</b><small>subscriptions عايشة</small></div>
        <div><b>{leaked}</b><small>Cubits مقفولة ولسه في الذاكرة</small></div>
        <div><b>{errors}</b><small>StateError</small></div>
      </div>
      {leaked > 0 && <div className="lab-warn">{leaked} Cubit اتقفلوا ومش هيتمسحوا من الذاكرة: في حاجة عايشة لسه ماسكاهم.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, margin: "12px 0" }}>
        {screens.length === 0 && <p className="lab-hint">الـ Cubits هتظهر هنا.</p>}
        {screens.map((s) => {
          const isLeak = !s.open && (s.subscribed || s.pending > 0);
          return (
            <div key={s.id} style={{
              background: "var(--bg)", borderRadius: 12, padding: "8px 12px", fontSize: 13.5,
              border: `1px solid ${isLeak ? "var(--warn)" : s.open ? "var(--good)" : "var(--line)"}`,
              opacity: !s.open && !isLeak ? 0.55 : 1,
            }}>
              <b dir="ltr" style={{ fontFamily: "IBM Plex Mono, monospace" }}>Cubit #{s.id}</b>
              <div>{s.open ? "مفتوح" : isLeak ? "مقفول ولسه متعلّق" : "مقفول واتمسح"}</div>
              <small style={{ color: "var(--muted)", display: "block" }}>
                subscription: {s.subscribed ? "عايشة" : "اتلغت"}
                {s.pending > 0 && <> · {s.pending} callback مستني</>}
              </small>
              <small style={{ color: "var(--muted)" }}>emit: {s.emits}{s.errors > 0 && <span style={{ color: "var(--warn)" }}> · StateError: {s.errors}</span>}</small>
            </div>
          );
        })}
      </div>
      <p className="lab-hint">الأحداث اللي طلعت: {events}</p>
      <Log lines={lines} />
    </section>
  );
}
