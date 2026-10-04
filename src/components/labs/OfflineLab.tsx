"use client";
import { useEffect, useRef, useState } from "react";
import { Log, sleep, useLog } from "./useLog";
import Switch from "./Switch";

type State = "pending" | "syncing" | "synced" | "failed";
type Book = { id: number; title: string; state: State };

export default function OfflineLab() {
  const [online, setOnline] = useState(false);
  const [error500, setError500] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [title, setTitle] = useState("");
  const { lines, add } = useLog();

  // refs mirror state so the async drain loop always sees current values
  const onlineRef = useRef(online); onlineRef.current = online;
  const errorRef = useRef(error500); errorRef.current = error500;
  const queue = useRef<number[]>([]);
  const draining = useRef(false);
  const attempt = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);
  const [queueLen, setQueueLen] = useState(0);

  const setState = (id: number, state: State) => setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, state } : b)));
  const titleOf = (id: number) => booksRef.current.find((b) => b.id === id)?.title ?? "";
  const booksRef = useRef(books); booksRef.current = books;

  async function drain() {
    if (draining.current || !onlineRef.current) return;
    draining.current = true;
    while (queue.current.length && onlineRef.current) {
      const id = queue.current[0];
      setState(id, "syncing"); add("req", <>بنبعت «{titleOf(id)}» للسيرفر</>);
      await sleep(700);
      if (!onlineRef.current) { setState(id, "pending"); add("cancel", <>النت فصل في النص، «{titleOf(id)}» رجع pending</>); break; }
      if (errorRef.current) {
        setState(id, "failed");
        attempt.current++;
        const wait = Math.min(8000, 1000 * 2 ** (attempt.current - 1));
        add("bad", <>السيرفر رجّع 500 لـ «{titleOf(id)}»، هنحاول تاني بعد {wait / 1000}s، ووقفنا عشان نحافظ على الترتيب</>);
        draining.current = false;
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => { setState(id, "pending"); drain(); }, wait);
        return;
      }
      attempt.current = 0;
      setState(id, "synced");
      queue.current.shift(); setQueueLen(queue.current.length);
      add("ok", <>«{titleOf(id)}» اتزامن</>);
    }
    draining.current = false;
  }

  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current); }, []);

  function addBook() {
    const t = title.trim(); if (!t) return;
    const book: Book = { id: nextId.current++, title: t, state: "pending" };
    booksRef.current = [book, ...booksRef.current];
    setBooks(booksRef.current);
    queue.current.push(book.id); setQueueLen(queue.current.length);
    setTitle("");
    add("key", <>«{t}» اتكتب في الـ DB بحالة pending واتضاف للـ queue، والشاشة اتحدثت فورًا</>);
    setTimeout(drain, 0);
  }

  function toggleOnline(v: boolean) {
    setOnline(v); onlineRef.current = v;
    add(v ? "ok" : "cancel", v ? "النت رجع: الـ SyncService بدأ يفضّي الـ queue" : "النت فصل");
    if (v) drain();
  }

  function toggle500(v: boolean) {
    setError500(v); errorRef.current = v;
    if (!v) drain();
  }

  const status = !online ? "النت فاصل: الكتابة بتروح للـ DB والـ queue بس"
    : error500 ? "السيرفر بيرجّع 500: هنحاول تاني بعد backoff"
    : queueLen ? "بنزامن الـ queue بالترتيب" : "كله متزامن";

  return (
    <section className="lab">
      <h2>Offline-first والـ sync queue</h2>
      <p>ضيف كتب والنت فاصل: هتظهر فورًا بحالة pending لأن الـ UI بتقرا من الـ DB. افتح النت وشوف الـ queue بتتزامن بالترتيب. وجرّب تخلي السيرفر يرجّع 500 عشان تشوف الـ backoff.</p>
      <div className="lab-controls">
        <Switch checked={online} onChange={toggleOnline}>النت شغال</Switch>
        <Switch checked={error500} onChange={toggle500}>السيرفر بيرجّع 500</Switch>
      </div>
      <div className="add-row">
        <input className="lab-input" placeholder="اسم الكتاب" autoComplete="off" aria-label="اسم الكتاب" value={title}
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addBook(); }} />
        <button className="btn" type="button" onClick={addBook}>ضيف</button>
      </div>
      <div className="lab-stats">
        <div><b>{queueLen}</b><small>عمليات في الـ queue</small></div>
        <div className="wide"><b>{status}</b><small>الحالة</small></div>
      </div>
      <ul className="book-list">
        {books.length === 0 ? <li className="empty">المكتبة فاضية. ضيف كتاب.</li> :
          books.map((b) => <li key={b.id}><span>{b.title}</span><span className={`chip ${b.state}`}>{b.state}</span></li>)}
      </ul>
      <Log lines={lines} />
    </section>
  );
}
