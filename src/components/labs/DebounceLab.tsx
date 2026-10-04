"use client";
import { useEffect, useRef, useState } from "react";
import { Log, useLog } from "./useLog";
import Switch from "./Switch";

/** Short queries are slower on purpose, like a real server scanning more results. */
const latency = (q: string) => Math.max(250, 1700 - q.length * 220);

export default function DebounceLab() {
  const [debounce, setDebounce] = useState(true);
  const [requestId, setRequestId] = useState(true);
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(0);
  const [ignored, setIgnored] = useState(0);
  const [shown, setShown] = useState<string | null>(null);
  const [pending, setPending] = useState(0); // in-flight requests + armed timer
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);
  const reqIdRef = useRef(requestId);
  reqIdRef.current = requestId;
  const { lines, add, reset } = useLog();

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function fire(q: string) {
    const id = ++latest.current;
    setSent((s) => s + 1);
    setPending((p) => p + 1);
    add("req", <>طلب #{id} اتبعت: <code>{q}</code> وهياخد {latency(q)}ms</>);
    setTimeout(() => {
      setPending((p) => p - 1);
      const stale = id !== latest.current;
      if (stale && reqIdRef.current) {
        setIgnored((n) => n + 1);
        add("drop", <>طلب #{id} رجع متأخر واتجاهل لأنه قديم</>);
      } else {
        setShown(q);
        add(stale ? "bad" : "ok", stale ? <>طلب #{id} رجع متأخر وغطّى على نتيجة أحدث!</> : <>طلب #{id} رجع واتعرض: <code>{q}</code></>);
      }
    }, latency(q));
  }

  function onInput(raw: string) {
    setValue(raw);
    const q = raw.trim();
    add("key", <>كتبت: <code>{raw}</code></>);
    if (q.length < 2) {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; setPending((p) => p - 1); }
      latest.current++;
      setShown(null);
      return;
    }
    if (debounce) {
      if (timer.current) { clearTimeout(timer.current); add("cancel", "الـ debounce اتلغى واتبدأ من جديد"); }
      else setPending((p) => p + 1);
      timer.current = setTimeout(() => { timer.current = null; setPending((p) => p - 1); fire(q); }, 350);
    } else fire(q);
  }

  function restart() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null; latest.current++;
    setValue(""); setSent(0); setIgnored(0); setShown(null); setPending(0); reset();
  }

  const cur = value.trim();
  const stale = shown !== null && cur.length >= 2 && shown !== cur && pending === 0;

  return (
    <section className="lab">
      <h2>البحث والنتايج القديمة</h2>
      <p>اكتب <code>flutter</code> في الخانة. الطلبات القصيرة بطيئة عن قصد، زي سيرفر حقيقي بيدوّر في نتايج أكتر. جرّب تقفل الـ debounce، وبعدين اقفل الـ request id، وشوف الشاشة بتعرض إيه في الآخر.</p>
      <div className="lab-controls">
        <Switch checked={debounce} onChange={setDebounce}>debounce 350ms</Switch>
        <Switch checked={requestId} onChange={setRequestId}>request id</Switch>
        <button className="btn ghost" type="button" onClick={restart}>ابدأ من جديد</button>
      </div>
      <input className="lab-input" dir="ltr" placeholder="flutter" autoComplete="off" spellCheck={false}
        aria-label="خانة البحث" value={value} onChange={(e) => onInput(e.target.value)} style={{ fontFamily: "IBM Plex Mono, monospace" }} />
      <div className="lab-stats">
        <div><b>{sent}</b><small>طلبات اتبعتت</small></div>
        <div><b>{ignored}</b><small>نتايج اتجاهلت</small></div>
        <div className="wide"><b dir="ltr">{shown ?? "—"}</b><small>الشاشة بتعرض نتايج</small></div>
      </div>
      {stale && <div className="lab-warn">الشاشة بتعرض نتايج بحث قديم، مش اللي المستخدم كاتبه دلوقتي!</div>}
      <Log lines={lines} />
    </section>
  );
}
