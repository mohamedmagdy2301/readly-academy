"use client";
import { useState } from "react";
import Switch from "./Switch";

const MONO = "IBM Plex Mono, monospace";

type BookId = "atomic" | "dune" | "sapiens";
type St = "wantToRead" | "reading" | "finished";
type Row = { v: number; status: St; pending: boolean };
type Db = Partial<Record<BookId, Row>>;
type Ev = { seq: number; type: "upserted" | "removed"; id: BookId; v: number; status?: St };
type Delivery = "ok" | "dup" | "late" | "lost";
type Kind = "ok" | "skip" | "bad" | "info";
type Step = { title: React.ReactNode; notes: { kind: Kind; text: React.ReactNode }[]; db: Db; removed: Partial<Record<BookId, number>>; cursor: number | null };

const TITLES: Record<BookId, string> = { atomic: "Atomic Habits", dune: "Dune", sapiens: "Sapiens" };
const STATUS: Record<St, string> = { wantToRead: "عايز أقراه", reading: "بقراه", finished: "خلصته" };

const START_CURSOR = 1050;
const EVENTS: Ev[] = [
  { seq: 1051, type: "upserted", id: "dune", v: 4, status: "reading" },
  { seq: 1052, type: "upserted", id: "atomic", v: 7, status: "reading" },
  { seq: 1053, type: "upserted", id: "sapiens", v: 8, status: "finished" },
  { seq: 1054, type: "removed", id: "sapiens", v: 9 },
  { seq: 1055, type: "upserted", id: "dune", v: 5, status: "finished" },
];
const LATEST = EVENTS[EVENTS.length - 1].seq;

const initialDb = (pending: boolean): Db => ({
  atomic: pending ? { v: 6, status: "finished", pending: true } : { v: 6, status: "wantToRead", pending: false },
  dune: { v: 3, status: "wantToRead", pending: false },
  sapiens: { v: 7, status: "reading", pending: false },
});

const PRESETS: { label: string; d: Delivery[]; pending?: boolean }[] = [
  { label: "كله وصل مرة بالترتيب", d: ["ok", "ok", "ok", "ok", "ok"] },
  { label: "Dune v4 اتأخر", d: ["late", "ok", "ok", "ok", "ok"] },
  { label: "الحذف وصل قبل التعديل", d: ["ok", "ok", "late", "ok", "ok"] },
  { label: "اتكرروا بعد reconnect", d: ["dup", "ok", "dup", "ok", "ok"] },
  { label: "1052 ضاع", d: ["ok", "lost", "ok", "ok", "ok"] },
  { label: "آخر event ضاع", d: ["ok", "ok", "ok", "ok", "lost"] },
  { label: "تعديلك لسه pending", d: ["ok", "ok", "ok", "ok", "ok"], pending: true },
];

type Opts = { cond: boolean; tomb: boolean; catchup: boolean; pending: boolean };

const evText = (e: Ev) => (
  <span dir="ltr">
    <span style={{ fontFamily: MONO, fontSize: 13 }}>#{e.seq} book.{e.type} {TITLES[e.id]} v{e.v}</span>
    {e.status ? <> <bdi dir="rtl">«{STATUS[e.status]}»</bdi></> : null}
  </span>
);

function run(o: Opts, delivery: Delivery[]): Step[] {
  const db: Db = initialDb(o.pending);
  const removed: Partial<Record<BookId, number>> = {};
  const deleted = new Set<BookId>(); // removed at some point in this run, whatever the switches say
  let cursor: number | null = o.catchup ? START_CURSOR : null;
  const steps: Step[] = [];
  const snap = (title: React.ReactNode, notes: Step["notes"]) =>
    steps.push({ title, notes, db: JSON.parse(JSON.stringify(db)), removed: { ...removed }, cursor });

  /** _putServerRow / _removeServerRow, with or without the rule. */
  function apply(e: Ev, notes: Step["notes"]) {
    const row = db[e.id];
    if (e.type === "upserted") {
      const tomb = removed[e.id];
      if (o.tomb && tomb !== undefined && tomb >= e.v) {
        notes.push({ kind: "skip", text: <>اتجاهل: <code>removedBooks</code> فيه {TITLES[e.id]} اتمسح عند v{tomb}، والـ v{e.v} أقدم</> });
        return;
      }
      if (!row) {
        db[e.id] = { v: e.v, status: e.status!, pending: false };
        if (o.tomb && tomb !== undefined) delete removed[e.id];
        notes.push(deleted.has(e.id)
          ? { kind: "bad", text: <>اتضاف تاني: مفيش صف يقارن بيه، فـ {TITLES[e.id]} رجع للمكتبة كـ zombie</> }
          : { kind: "ok", text: <>اتضاف v{e.v}</> });
        return;
      }
      if (o.cond) {
        if (row.pending) notes.push({ kind: "skip", text: <>اتجاهل: الصف <code>pending</code>. تعديلك لحد ما الـ queue تبعته، والسيرفر هيرد 409 والـ <code>FieldMerge</code> يدمج</> });
        else if (row.v >= e.v) notes.push({ kind: "skip", text: <>اتجاهل: عندك v{row.v}، والجاي v{e.v} مش أكبر</> });
        else {
          db[e.id] = { v: e.v, status: e.status!, pending: false };
          notes.push({ kind: "ok", text: <>اتحدث من v{row.v} لـ v{e.v}</> });
        }
      } else {
        db[e.id] = { v: e.v, status: e.status!, pending: false };
        if (row.pending) notes.push({ kind: "bad", text: <>upsert عادي كتب فوق تعديلك اللي لسه ماتبعتش: الحالة رجعت لورا</> });
        else if (row.v > e.v) notes.push({ kind: "bad", text: <>upsert عادي: v{e.v} القديمة كتبت فوق v{row.v}</> });
        else notes.push({ kind: "ok", text: <>اتكتب v{e.v}</> });
      }
    } else {
      if (o.tomb) removed[e.id] = Math.max(removed[e.id] ?? 0, e.v);
      if (!row) notes.push({ kind: "skip", text: <>مفيش صف أصلًا</> });
      else if (o.cond && (row.pending || row.v > e.v)) notes.push({ kind: "skip", text: <>اتجاهل: الصف {row.pending ? "pending" : `v${row.v} أحدث`}</> });
      else {
        delete db[e.id];
        deleted.add(e.id);
        notes.push({ kind: "ok", text: <>اتمسح{o.tomb ? <> وفي <code>removedBooks</code> إنه اتمسح عند v{e.v}</> : <>، والـ version بتاعه اتمسح معاه</>}</> });
      }
    }
  }

  /** _catchUp: GET /library/changes?since=cursor, applied with the cursor in one transaction. */
  function catchUp(reason: React.ReactNode) {
    const since = cursor!;
    const page = EVENTS.filter((e) => e.seq > since);
    // _collapse: one write per book, the highest version wins inside the page
    const byKey = new Map<BookId, Ev>();
    for (const e of page) if (!byKey.has(e.id) || e.v > byKey.get(e.id)!.v) byKey.set(e.id, e);
    const collapsed = page.filter((e) => byKey.get(e.id) === e);
    const notes: Step["notes"] = [{ kind: "info", text: reason }];
    if (collapsed.length < page.length) notes.push({ kind: "info", text: <>الصفحة فيها {page.length} events، والـ <code>_collapse</code> خلاهم {collapsed.length}: كتابة واحدة لكل كتاب</> });
    for (const e of collapsed) {
      const sub: Step["notes"] = [];
      apply(e, sub);
      notes.push(...sub.map((n) => ({ ...n, text: <>#{e.seq}: {n.text}</> })));
    }
    cursor = LATEST;
    snap(<>catch-up: <code dir="ltr">GET /library/changes?since={since}</code>، والـ cursor بقى {LATEST} في نفس الـ transaction</>, notes);
  }

  snap(<>البداية: الـ DB على الموبايل{o.catchup ? <>، والـ cursor عند {START_CURSOR}</> : null}</>, []);

  const order: Ev[] = [
    ...EVENTS.filter((_, i) => delivery[i] === "ok" || delivery[i] === "dup"),
    ...EVENTS.filter((_, i) => delivery[i] === "late"),
    ...EVENTS.filter((_, i) => delivery[i] === "dup"),
  ];
  const seen = new Set<number>();

  for (const e of order) {
    const again = seen.has(e.seq);
    seen.add(e.seq);
    const notes: Step["notes"] = [];
    if (o.catchup && e.seq <= cursor!) {
      notes.push({ kind: "skip", text: <>اتجاهل قبل ما يوصل للـ DB: الـ seq {e.seq} ≤ الـ cursor {cursor}</> });
      snap(<>وصل {again ? "تاني " : ""}{evText(e)}</>, notes);
      continue;
    }
    apply(e, notes);
    let gap = false;
    if (o.catchup) {
      // the cursor moves only over a run with no holes
      const got = new Set([...seen].filter((s) => s > cursor!));
      while (got.has(cursor! + 1)) cursor!++;
      gap = [...got].some((s) => s > cursor!);
      if (gap) notes.push({ kind: "info", text: <>فيه فجوة: الـ cursor واقف عند {cursor}، و{[...got].filter((s) => s > cursor!).join(" و")} وصلوا. <code>requestCatchUp()</code></> });
    }
    snap(<>وصل {again ? "تاني " : ""}{evText(e)}</>, notes);
    if (gap) catchUp(<>بيجيب كل اللي بعد {cursor}</>);
  }

  // reconnect: the hello says how far the server is
  if (o.catchup) {
    if (cursor !== LATEST) catchUp(<>الـ <code>hello</code> بعد الـ reconnect بيقول latest = {LATEST}، والـ cursor {cursor}: <code>_onHello</code> بيعمل catch-up</>);
    else snap(<>reconnect: الـ <code>hello</code> بيقول latest = {LATEST}</>, [{ kind: "ok", text: <>الـ cursor = latest: مفيش حاجة فاتتك</> }]);
  } else {
    snap(<>reconnect: الـ <code>hello</code> بيقول latest = {LATEST}</>, [{ kind: "skip", text: <>مفيش cursor تقارن بيه: مانعرفش فاتنا إيه</> }]);
  }
  return steps;
}

/** What the DB should hold once everything settles. */
function verdict(db: Db, pending: boolean) {
  const out: { id: BookId; ok: boolean; why: string }[] = [];
  const a = db.atomic;
  if (pending) out.push({ id: "atomic", ok: !!a && a.pending && a.status === "finished", why: a?.pending ? "تعديلك محفوظ لحد ما يتبعت" : "تعديلك اتكتب فوقه" });
  else out.push({ id: "atomic", ok: !!a && a.v === 7, why: a?.v === 7 ? "v7 زي السيرفر" : `عندك v${a?.v}، والسيرفر v7: فاتك تعديل` });
  const d = db.dune;
  out.push({ id: "dune", ok: !!d && d.v === 5, why: d?.v === 5 ? "v5 زي السيرفر" : `عندك v${d?.v}، والسيرفر v5` });
  out.push({ id: "sapiens", ok: !db.sapiens, why: db.sapiens ? (db.sapiens.v === 8 ? "رجع كـ zombie بعد ما اتمسح" : "لسه موجود، والسيرفر مسحه") : "اتمسح زي السيرفر" });
  return out;
}

const KIND_COLOR: Record<Kind, string> = { ok: "var(--good)", skip: "var(--muted)", bad: "var(--warn)", info: "var(--accent)" };

export default function EventMergeLab() {
  const [o, setO] = useState<Opts>({ cond: false, tomb: false, catchup: false, pending: false });
  const [delivery, setDelivery] = useState<Delivery[]>(PRESETS[2].d);
  const [i, setI] = useState(0);
  const steps = run(o, delivery);
  const at = Math.min(i, steps.length - 1);
  const step = steps[at];
  const done = at === steps.length - 1;
  const result = verdict(steps[steps.length - 1].db, o.pending);
  const allOk = result.every((r) => r.ok);

  const setOpt = (k: keyof Opts) => (v: boolean) => { setO((x) => ({ ...x, [k]: v })); setI(0); };
  const setD = (n: number, d: Delivery) => { setDelivery((x) => x.map((y, j) => (j === n ? d : y))); setI(0); };
  const preset = (p: (typeof PRESETS)[number]) => { setDelivery(p.d); setO((x) => ({ ...x, pending: !!p.pending })); setI(0); };

  return (
    <section className="lab">
      <h2>دمج الـ events مع drift</h2>
      <p>السيرفر طلّع 5 events للمكتبة بالترتيب ده. انت اللي بتقرر الشبكة توصّل كل واحد إزاي. ابدأ والحمايات التلاتة مقفولة، واختار سيناريو، وامشي خطوة خطوة. وبعدين شغّل الحماية اللي تفتكر إنها بتحل المشكلة دي بالذات.</p>

      <div className="lab-controls">
        <Switch checked={o.cond} onChange={setOpt("cond")}>الكتابة المشروطة (<code>synced</code> و<code>version</code> أكبر)</Switch>
        <Switch checked={o.tomb} onChange={setOpt("tomb")}>الـ tombstone (<code>removedBooks</code>)</Switch>
        <Switch checked={o.catchup} onChange={setOpt("catchup")}>الـ <code>seq</code> والـ cursor والـ catch-up</Switch>
      </div>
      <div className="lab-controls" aria-label="سيناريوهات جاهزة">
        {PRESETS.map((p) => <button key={p.label} type="button" className="chip-btn" onClick={() => preset(p)}>{p.label}</button>)}
      </div>

      <div style={{ display: "grid", gap: 6, margin: "10px 0" }}>
        {EVENTS.map((e, n) => (
          <div key={e.seq} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "6px 10px" }}>
            <span style={{ flex: "1 1 220px", minWidth: 0 }}>{evText(e)}</span>
            <select aria-label={`الشبكة وصّلت ${e.seq} إزاي`} value={delivery[n]} onChange={(ev) => setD(n, ev.target.value as Delivery)}
              style={{ font: "inherit", fontSize: 14, padding: "3px 8px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: delivery[n] === "ok" ? "var(--ink)" : "var(--warn)" }}>
              <option value="ok">وصل في وقته</option>
              <option value="dup">وصل مرتين</option>
              <option value="late">اتأخر لآخر الطابور</option>
              <option value="lost">ضاع</option>
            </select>
          </div>
        ))}
        <Switch checked={o.pending} onChange={setOpt("pending")}>على الموبايل دوست «خلصته» على Atomic Habits، والـ PATCH لسه في الـ queue</Switch>
      </div>

      <div className="lab-controls">
        <button className="btn" type="button" onClick={() => setI(at + 1)} disabled={done}>الخطوة الجاية</button>
        <button className="btn ghost" type="button" onClick={() => setI(steps.length - 1)} disabled={done}>للآخر</button>
        <button className="btn ghost" type="button" onClick={() => setI(0)}>من الأول</button>
        <small style={{ color: "var(--muted)" }}>{at + 1} / {steps.length}</small>
      </div>

      <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "8px 12px", minHeight: 74 }}>
        <div style={{ fontWeight: 600 }}>{step.title}</div>
        <ul style={{ margin: "4px 0 0", paddingInlineStart: 18, fontSize: 14.5 }}>
          {step.notes.map((n, k) => <li key={k} style={{ color: KIND_COLOR[n.kind] }}>{n.text}</li>)}
        </ul>
      </div>

      <div style={{ overflowX: "auto", margin: "10px 0" }}>
        <table style={{ width: "100%", minWidth: 0, fontSize: 14, margin: 0 }}>
          <thead>
            <tr><th>الكتاب في drift</th><th>version</th><th>الحالة</th></tr>
          </thead>
          <tbody>
            {(Object.keys(TITLES) as BookId[]).map((id) => {
              const r = step.db[id];
              const tomb = step.removed[id];
              return (
                <tr key={id} style={{ opacity: r ? 1 : 0.55 }}>
                  <td dir="ltr" style={{ textAlign: "start" }}>{TITLES[id]}</td>
                  <td dir="ltr" style={{ fontFamily: MONO }}>{r ? `v${r.v}` : "—"}</td>
                  <td>{r ? STATUS[r.status] : tomb !== undefined ? <>اتمسح (tombstone v{tomb})</> : "مش موجود"}
                    {r && <small dir="ltr" style={{ fontFamily: MONO, marginInlineStart: 8, display: "inline-block", color: r.pending ? "var(--warn)" : "var(--muted)" }}>{r.pending ? "pending" : "synced"}</small>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {o.catchup && <p className="lab-hint" style={{ marginTop: 0 }}>الـ cursor في <code>SyncCursors</code>: <b dir="ltr">{step.cursor}</b> · آخر seq على السيرفر: <span dir="ltr">{LATEST}</span></p>}

      {done && (allOk
        ? <div className="lab-warn" style={{ background: "var(--good-soft)", color: "var(--good)" }}>الـ DB صح: نفس اللي على السيرفر{o.pending ? "، وتعديلك مستني الـ queue" : ""}، مهما كان ترتيب الوصول.</div>
        : <div className="lab-warn">
            الـ DB غلط:
            <ul style={{ margin: "4px 0 0", paddingInlineStart: 18, fontWeight: 400 }}>
              {result.filter((r) => !r.ok).map((r) => <li key={r.id}><bdi dir="ltr">{TITLES[r.id]}</bdi>: {r.why}</li>)}
            </ul>
          </div>)}
    </section>
  );
}
