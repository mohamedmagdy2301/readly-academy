"use client";
import { useState } from "react";
import Switch from "./Switch";

const MONO = "IBM Plex Mono, monospace";
const CACHE_FOR = 30;

type PId = "db" | "repo" | "filters" | "books" | "visible" | "details";
type Route = "library" | "details";
type Mode = "watch" | "read" | "listen";
type P = { alive: boolean; builds: number; cacheUntil: number | null; dirty: boolean; hadListener: boolean };
type LogKind = "ok" | "bad" | "req" | "cancel" | "drop" | "key";
type Line = { id: number; t: number; kind: LogKind; text: React.ReactNode };
type S = {
  stack: Route[]; mode: Mode; cacheFor: boolean; select: boolean; clock: number;
  p: Record<PId, P>; screen: Record<Route, number>; stale: boolean; seq: number; log: Line[];
};

const NODES: { id: PId; name: string; keepAlive?: boolean; deps: PId[]; note: string }[] = [
  { id: "db", name: "appDatabaseProvider", keepAlive: true, deps: [], note: "overridden in main()" },
  { id: "repo", name: "libraryRepositoryProvider", keepAlive: true, deps: ["db"], note: "watch: appDatabase" },
  { id: "filters", name: "libraryFiltersProvider", deps: [], note: "Notifier: LibraryFilters" },
  { id: "books", name: "libraryBooksProvider", deps: ["repo", "filters"], note: "watch: repository + filters.select(status)" },
  { id: "visible", name: "visibleBooksProvider", deps: ["books", "filters"], note: "watch: libraryBooks + filters.select(query)" },
  { id: "details", name: "bookDetailsProvider(dune)", deps: [], note: "family + cacheFor(30s)" },
];
const NODE = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<PId, (typeof NODES)[number]>;
const ORDER: PId[] = ["db", "repo", "filters", "books", "visible", "details"];
const code = (s: string) => <code dir="ltr">{s}</code>;

const fresh = (): S => ({
  stack: [], mode: "watch", cacheFor: true, select: true, clock: 0,
  p: Object.fromEntries(ORDER.map((id) => [id, { alive: false, builds: 0, cacheUntil: null, dirty: false, hadListener: false }])) as Record<PId, P>,
  screen: { library: 0, details: 0 }, stale: false, seq: 0, log: [],
});

/** Who listens to whom right now, and whether that listener is paused (its screen is covered). */
function listeners(s: S) {
  const top = s.stack[s.stack.length - 1];
  const map: Record<PId, { from: string; paused: boolean }[]> = { db: [], repo: [], filters: [], books: [], visible: [], details: [] };
  if (s.stack.includes("library")) {
    const paused = top !== "library";
    map.filters.push({ from: "LibraryView", paused }); // the status chip: ref.watch(...select(status))
    if (s.mode !== "read") map.visible.push({ from: "LibraryView", paused });
  }
  if (s.stack.includes("details")) map.details.push({ from: "BookDetailsPage", paused: top !== "details" });
  // providers listen to their deps while they are alive; walk top-down so a provider's own state is known first
  for (const id of ["visible", "books", "repo", "details"] as PId[]) {
    if (!s.p[id].alive && !map[id].length) continue;
    const paused = map[id].length > 0 && map[id].every((l) => l.paused);
    for (const d of NODE[id].deps) map[d].push({ from: NODE[id].name, paused });
  }
  return map;
}

const isPaused = (l: { paused: boolean }[]) => l.length > 0 && l.every((x) => x.paused);

function step(prev: S, f: (s: S, log: (kind: LogKind, text: React.ReactNode) => void) => void): S {
  const s: S = { ...prev, stack: [...prev.stack], screen: { ...prev.screen }, p: Object.fromEntries(ORDER.map((id) => [id, { ...prev.p[id] }])) as Record<PId, P>, log: prev.log };
  const lines: Line[] = [];
  const log = (kind: LogKind, text: React.ReactNode) => lines.push({ id: s.seq++, t: s.clock, kind, text });
  f(s, log);
  reconcile(s, log);
  s.log = [...lines.reverse(), ...prev.log].slice(0, 40);
  return s;
}

/** Create what is listened to, dispose what isn't (autoDispose), run the cacheFor timer. */
function reconcile(s: S, log: (kind: LogKind, text: React.ReactNode) => void) {
  for (let pass = 0; pass < 4; pass++) {
    const map = listeners(s);
    // create, deps first
    for (const id of ORDER) {
      const need = map[id].length > 0;
      if (need && !s.p[id].alive) {
        s.p[id].alive = true;
        s.p[id].builds++;
        log("req", <>{code(NODE[id].name)} اتعمل (build #{s.p[id].builds}){id === "books" ? "، والـ drift query اتفتح" : ""}</>);
        if (id === "details" && s.cacheFor) log("key", <>{code("ref.cacheFor(30s)")}: {code("keepAlive()")} رجّع link</>);
      }
    }
    // dispose, dependents first
    let changed = false;
    for (const id of [...ORDER].reverse()) {
      const p = s.p[id];
      const has = map[id].length > 0;
      if (has) {
        if (p.cacheUntil !== null) { p.cacheUntil = null; log("key", <>{code("onResume")}: حد رجع يسمع، والـ timer اتلغى</>); }
        p.hadListener = true;
        continue;
      }
      if (!p.alive || NODE[id].keepAlive) continue;
      if (id === "details" && s.cacheFor) {
        if (p.hadListener && p.cacheUntil === null) {
          p.cacheUntil = s.clock + CACHE_FOR;
          p.hadListener = false;
          log("cancel", <>{code("onCancel")}: آخر listener مشي. الـ link مفتوح {CACHE_FOR} ثانية</>);
          continue;
        }
        if (p.cacheUntil !== null && s.clock < p.cacheUntil) continue;
        if (p.cacheUntil !== null) log("cancel", <>الـ {CACHE_FOR} ثانية خلصوا: {code("link.close()")}</>);
      }
      p.alive = false;
      p.cacheUntil = null;
      p.dirty = false;
      p.hadListener = false;
      changed = true;
      log("drop", <>{code(NODE[id].name)} مالوش listener: اتمسح{id === "books" ? "، والـ drift query اتقفل" : ""}</>);
    }
    if (!changed) break;
  }
}

/** A dependency changed: rebuild the providers that watch it, unless they're paused. */
function propagate(s: S, from: PId[], log: (kind: LogKind, text: React.ReactNode) => void) {
  const map = listeners(s);
  const queue = [...from];
  const rebuilt = new Set<PId>();
  while (queue.length) {
    const id = queue.shift()!;
    if (!s.p[id].alive || rebuilt.has(id)) continue;
    if (isPaused(map[id])) {
      if (!s.p[id].dirty) log("cancel", <>{code(NODE[id].name)} paused: هيتبني لما الشاشة ترجع</>);
      s.p[id].dirty = true;
      if (id === "books") queue.push("visible");
      continue;
    }
    rebuilt.add(id);
    s.p[id].builds++;
    log("req", <>{code(NODE[id].name)} اتبني تاني (build #{s.p[id].builds}){id === "books" ? ": الـ drift query القديم اتقفل والجديد اتفتح" : ""}</>);
    if (id === "books") queue.push("visible");
  }
  return rebuilt;
}

function screenReacts(s: S, rebuilt: Set<PId>, log: (kind: LogKind, text: React.ReactNode) => void, chipChanged = false) {
  if (!s.stack.includes("library")) return;
  if (s.stack[s.stack.length - 1] !== "library") return;
  const visibleChanged = rebuilt.has("visible");
  if (s.mode === "watch" && (visibleChanged || chipChanged)) {
    s.screen.library++;
    s.stale = false;
    log("ok", <>LibraryView اتبنت تاني بالقيمة الجديدة</>);
  } else if (s.mode === "listen") {
    if (visibleChanged) log("ok", <>الـ callback بتاع {code("ref.listen")} اتنادى (SnackBar مثلًا). الشاشة نفسها مااتبنتش</>);
    if (chipChanged) s.screen.library++;
  } else if (s.mode === "read") {
    if (chipChanged) {
      s.screen.library++;
      s.p.visible.builds++;
      s.p.books.builds++;
      s.stale = false;
      log("bad", <>LibraryView اتبنت عشان الـ chip، فالـ {code("ref.read")} عمل {code("visibleBooksProvider")} و{code("libraryBooksProvider")} من الأول، وقرا، واتمسحوا تاني</>);
    } else {
      s.stale = true;
      log("bad", <>مفيش listener على {code("visibleBooksProvider")}: الشاشة ماعرفتش، ولسه بتعرض القيمة القديمة</>);
    }
  }
}

export default function ProviderLifecycleLab() {
  const [s, setS] = useState<S>(fresh);
  const top = s.stack[s.stack.length - 1];
  const map = listeners(s);
  const act = (f: Parameters<typeof step>[1]) => setS((prev) => step(prev, f));

  const openLibrary = () => act((x, log) => {
    x.stack = ["library"];
    x.screen.library++;
    x.stale = false;
    log("key", <>فتحت المكتبة: LibraryView اتبنت</>);
    if (x.mode === "read") {
      // read creates the provider, takes one value, and leaves no listener behind
      for (const id of ["db", "repo", "filters", "books", "visible"] as PId[]) {
        if (x.p[id].alive) continue;
        x.p[id].alive = true;
        x.p[id].builds++;
        log("req", <>{code(NODE[id].name)} اتعمل (build #{x.p[id].builds})</>);
      }
      log("bad", <>{code("ref.read(visibleBooksProvider)")} عمل الـ provider وخد قيمة واحدة. مفيش listener، فهيتمسح على طول</>);
    }
  });
  const openDetails = () => act((x, log) => {
    x.stack = [...x.stack, "details"];
    x.screen.details++;
    log("key", <>فتحت صفحة Dune فوق المكتبة. LibraryView لسه في الشجرة بس مستخبية (TickerMode = false)</>);
    if (x.p.details.alive) log("ok", <>{code("bookDetailsProvider(dune)")} لسه في الذاكرة من المرة اللي فاتت: مفيش طلب جديد ولا spinner</>);
  });
  const back = () => act((x, log) => {
    const popped = x.stack.pop();
    log("key", popped === "details" ? <>رجعت للمكتبة</> : <>قفلت المكتبة</>);
    if (popped === "details" && x.stack.includes("library")) {
      const pend = (["books", "visible"] as PId[]).filter((id) => x.p[id].alive && x.p[id].dirty);
      for (const id of pend) {
        x.p[id].dirty = false;
        x.p[id].builds++;
        log("req", <>{code(NODE[id].name)} رجع من الـ pause واتبنى مرة واحدة بآخر قيمة (build #{x.p[id].builds})</>);
      }
      if (pend.includes("visible") && x.mode === "watch") { x.screen.library++; log("ok", <>LibraryView اتبنت مرة واحدة</>); }
      if (pend.includes("visible") && x.mode === "listen") log("ok", <>الـ callback بتاع {code("ref.listen")} اتنادى مرة واحدة</>);
    }
  });
  const status = () => act((x, log) => {
    log("key", <>غيّرت الحالة من الـ chip: {code("statusChanged(BookStatus.reading)")}</>);
    const rebuilt = propagate(x, ["books", "visible"], log);
    screenReacts(x, rebuilt, log, true);
  });
  const type = () => act((x, log) => {
    log("key", <>كتبت حرف في البحث: {code("queryChanged('d')")}</>);
    if (!x.select && x.p.books.alive) log("bad", <>من غير {code("select")}، {code("libraryBooks")} بيعمل watch للـ filters كلها، فأي حرف بيفتح الـ drift query من جديد</>);
    const rebuilt = propagate(x, x.select ? ["visible"] : ["books", "visible"], log);
    screenReacts(x, rebuilt, log);
  });
  const drift = () => act((x, log) => {
    log("key", <>drift: كتاب اتغير من جهاز تاني</>);
    if (!x.p.books.alive) {
      if (x.stack.includes("library")) { x.stale = true; log("bad", <>محدش بيسمع على المكتبة: الشاشة لسه بتعرض القيمة القديمة</>); }
      else log("cancel", <>مفيش حد بيسمع، ومفيش drift query مفتوح أصلًا</>);
      return;
    }
    const rebuilt = propagate(x, ["books"], log);
    screenReacts(x, rebuilt, log);
  });
  const wait = () => act((x, log) => {
    x.clock += 10;
    log("key", <>عدّت 10 ثواني</>);
  });
  // changing how the code is written starts the app over
  const config = (patch: Partial<Pick<S, "mode" | "cacheFor" | "select">>) =>
    setS({ ...fresh(), mode: s.mode, cacheFor: s.cacheFor, select: s.select, ...patch });

  const badge = (id: PId) => {
    const p = s.p[id];
    if (!p.alive) return { text: "مش موجود", color: "var(--muted)", bg: "var(--bg)" };
    if (NODE[id].keepAlive) return { text: "keepAlive", color: "var(--deep)", bg: "var(--deep-soft)" };
    if (p.cacheUntil !== null) return { text: `cacheFor: باقي ${Math.max(0, p.cacheUntil - s.clock)}s`, color: "var(--warn)", bg: "var(--warn-soft)" };
    if (isPaused(map[id])) return { text: "paused", color: "var(--accent)", bg: "var(--accent-soft)" };
    return { text: "عايش", color: "var(--good)", bg: "var(--good-soft)" };
  };

  return (
    <section className="lab">
      <h2>الـ providers بتعيش وتموت امتى</h2>
      <p>ده الـ graph بتاع المكتبة من الدرس. افتح المكتبة، وافتح صفحة كتاب فوقها، وارجع، واقفل، وبص على كل provider: مين اتعمل، ومين paused، ومين اتمسح، وليه. وبعدين غيّر الشاشة تستخدم {code("read")} أو {code("listen")} بدل {code("watch")} وجرّب تاني.</p>

      <div className="lab-controls" role="radiogroup" aria-label="LibraryView بتوصل لـ visibleBooksProvider بإيه">
        <small style={{ color: "var(--muted)" }}>LibraryView:</small>
        {(["watch", "read", "listen"] as Mode[]).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={s.mode === m} dir="ltr" style={{ fontFamily: MONO, fontSize: 13 }}
            className={`chip-btn${s.mode === m ? " active" : ""}`} onClick={() => config({ mode: m })}>ref.{m}(visibleBooksProvider)</button>
        ))}
      </div>
      <div className="lab-controls">
        <Switch checked={s.cacheFor} onChange={(v) => config({ cacheFor: v })}>{code("ref.cacheFor(30s)")} في {code("bookDetails")}</Switch>
        <Switch checked={s.select} onChange={(v) => config({ select: v })}>{code("select((f) => f.status)")} في {code("libraryBooks")}</Switch>
      </div>

      <div className="lab-controls">
        <button className="btn" type="button" onClick={openLibrary} disabled={s.stack.length > 0}>افتح المكتبة</button>
        <button className="btn" type="button" onClick={openDetails} disabled={top !== "library"}>افتح صفحة Dune</button>
        <button className="btn ghost" type="button" onClick={back} disabled={!s.stack.length}>{top === "details" ? "رجوع" : "اقفل المكتبة"}</button>
      </div>
      <div className="lab-controls">
        <button className="btn ghost" type="button" onClick={status} disabled={top !== "library"}>غيّر الحالة (chip)</button>
        <button className="btn ghost" type="button" onClick={type} disabled={top !== "library"}>اكتب حرف في البحث</button>
        <button className="btn ghost" type="button" onClick={drift}>كتاب اتغير في drift</button>
        <button className="btn ghost" type="button" onClick={wait}>+10 ثواني</button>
        <button className="btn ghost" type="button" onClick={() => config({})}>ابدأ من جديد</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8, margin: "12px 0" }}>
        {NODES.map((n) => {
          const b = badge(n.id);
          const ls = map[n.id];
          return (
            <div key={n.id} style={{ background: "var(--bg)", border: `1px solid ${s.p[n.id].alive ? b.color : "var(--line)"}`, borderRadius: 12, padding: "8px 12px", fontSize: 13.5, opacity: s.p[n.id].alive ? 1 : 0.6 }}>
              <b dir="ltr" style={{ fontFamily: MONO, fontSize: 12.5, display: "block", overflowWrap: "anywhere" }}>{n.name}</b>
              <span style={{ display: "inline-block", margin: "4px 0", padding: "0 8px", borderRadius: 99, background: b.bg, color: b.color, fontSize: 12.5, fontWeight: 600 }}>{b.text}</span>
              <small style={{ display: "block", color: "var(--muted)" }} dir="ltr">{n.note}</small>
              <small style={{ display: "block", color: "var(--muted)" }}>listeners: {ls.length}{ls.length ? <> ({ls.filter((l) => l.paused).length} paused)</> : null} · builds: {s.p[n.id].builds}</small>
            </div>
          );
        })}
        {(["library", "details"] as Route[]).map((r) => {
          const inStack = s.stack.includes(r);
          const hidden = inStack && top !== r;
          return (
            <div key={r} style={{ background: "var(--surface)", border: `1px dashed ${inStack ? "var(--ink)" : "var(--line)"}`, borderRadius: 12, padding: "8px 12px", fontSize: 13.5, opacity: inStack ? 1 : 0.6 }}>
              <b dir="ltr" style={{ fontFamily: MONO, fontSize: 12.5 }}>{r === "library" ? "LibraryView" : "BookDetailsPage"}</b>
              <div>{!inStack ? "مقفولة" : hidden ? "مستخبية تحت صفحة تانية" : "ظاهرة"}</div>
              <small style={{ color: "var(--muted)" }}>اتبنت: {s.screen[r]} مرة{r === "library" && s.stale && inStack ? <span style={{ color: "var(--warn)" }}> · بتعرض قيمة قديمة</span> : null}</small>
            </div>
          );
        })}
      </div>
      {s.mode === "read" && s.stack.includes("library") && <div className="lab-warn">{code("ref.read")} مش «watch أرخص»: مابيسيبش listener، فالـ autoDispose بيمسح الـ provider والشاشة مش هتتحدث أبدًا. لو عايز rebuilds أقل، {code("select")}.</div>}
      <p className="lab-hint">الوقت: <span dir="ltr">{s.clock}s</span></p>

      <ol className="sim-log" aria-live="polite">
        {s.log.map((l) => <li key={l.id} className={l.kind}><span className="t">{l.t}s</span> {l.text}</li>)}
      </ol>
    </section>
  );
}
