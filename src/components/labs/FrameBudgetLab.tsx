"use client";
import { useState } from "react";
import Switch from "./Switch";

/** 60Hz: one frame every 16.7ms, and the UI thread has to finish its part inside that. */
const BUDGET = 16.7;
const MONO = "IBM Plex Mono, monospace";

type Slice = { name: string; note?: string; ms: number; color: string };

/* ---------- scenario 1: changing a book's status (numbers from the lesson, reference phone) ---------- */

type Fixes = { hydrated: boolean; sortInBuild: boolean; groupInBuild: boolean; newFormatter: boolean };

function tapFrame(f: Fixes): Slice[] {
  const s: Slice[] = [];
  if (f.hydrated) s.push({ name: "HydratedCubit: toJson + jsonEncode", note: "4000 كتاب مع كل emit", ms: 18, color: "var(--warn)" });
  if (f.sortInBuild) s.push({ name: "BookList.build: List.sort + toLowerCase", note: "4000 عنوان", ms: 9, color: "var(--deep)" });
  if (f.groupInBuild) s.push({ name: "BookList.build: _groupByLetter", ms: 5.5, color: "var(--accent)" });
  else s.push({ name: "LibraryCubit: library.group", note: "مرة لما الليستة تتغير", ms: 1.5, color: "var(--accent)" });
  s.push({ name: "BUILD + LAYOUT", note: "باقي الشاشة", ms: 5.5, color: "var(--muted)" });
  s.push({ name: "DateFormat.yMMMd", note: f.newFormatter ? "جديد لكل tile، 15 tile" : "واحد متخزن لكل locale", ms: f.newFormatter ? 0.128 : 0.007, color: "var(--good)" });
  return s;
}

const IDLE_UI = 2.5; // the chip's ripple animation
const RASTER = 4;
const fmt = (ms: number) => (ms < 1 ? `${Math.round(ms * 1000)}µs` : `${+ms.toFixed(1)}ms`);
const sum = (s: Slice[]) => s.reduce((n, x) => n + x.ms, 0);

function StatusScenario() {
  const [f, setF] = useState<Fixes>({ hydrated: true, sortInBuild: true, groupInBuild: true, newFormatter: true });
  const set = (k: keyof Fixes) => (v: boolean) => setF((x) => ({ ...x, [k]: v }));
  const slices = tapFrame(f);
  const ui = sum(slices);
  const late = ui > BUDGET;
  const missed = Math.max(0, Math.ceil(ui / BUDGET) - 1);
  const frames = [IDLE_UI, IDLE_UI, IDLE_UI, ui, IDLE_UI, IDLE_UI, IDLE_UI];
  const scale = Math.max(40, ui + 4); // ms at the top of the chart
  const ranked = [...slices].sort((a, b) => b.ms - a.ms);

  return (
    <>
      <p>المستخدم في المكتبة (4000 كتاب) داس على chip وغيّر حالة كتاب. كل switch من دول حاجة من الدرس. ابدأ بيهم كلهم شغالين، وطفّيهم واحد واحد بالترتيب اللي تتوقع إنه هيفرق أكتر.</p>
      <div className="lab-controls">
        <Switch checked={f.hydrated} onChange={set("hydrated")}><code>LibraryCubit</code> بقى <code>HydratedCubit</code></Switch>
        <Switch checked={f.sortInBuild} onChange={set("sortInBuild")}><code>sort</code> جوه <code>build</code> (مش <code>COLLATE NOCASE</code>)</Switch>
        <Switch checked={f.groupInBuild} onChange={set("groupInBuild")}>التجميع بالحرف جوه <code>build</code></Switch>
        <Switch checked={f.newFormatter} onChange={set("newFormatter")}><code>DateFormat</code> جديد لكل tile</Switch>
      </div>

      <div dir="ltr" aria-label="الـ frames: UI وraster" style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 6, height: 150, padding: "8px 8px 0", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, margin: "12px 0 4px" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: `${(BUDGET / scale) * 142}px`, borderTop: "2px dashed var(--warn)" }}>
          <small style={{ position: "absolute", right: 6, top: -18, color: "var(--warn)", fontFamily: MONO, fontSize: 11 }}>16.7ms</small>
        </div>
        {frames.map((ms, i) => {
          const heavy = i === 3;
          const bad = ms > BUDGET;
          return (
            <div key={i} style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2, height: "100%" }} title={`frame ${i + 1}: UI ${fmt(ms)}, raster ${RASTER}ms`}>
              <div style={{ flex: 1, height: `${(ms / scale) * 142}px`, minHeight: 2, borderRadius: "4px 4px 0 0", background: bad ? "var(--warn)" : "var(--accent)", outline: heavy ? "2px solid var(--ink)" : undefined, outlineOffset: 1 }} />
              <div style={{ flex: 1, height: `${(RASTER / scale) * 142}px`, borderRadius: "4px 4px 0 0", background: "var(--muted)", opacity: 0.45 }} />
            </div>
          );
        })}
      </div>
      <p className="lab-hint" style={{ marginTop: 4 }}>كل frame عمودين: الـ UI (Dart) والـ raster. الـ frame اللي عليه إطار هو بتاع الضغطة. الأحمر عدّى الـ 16.7ms.</p>

      <div className="lab-stats">
        <div><b dir="ltr" style={{ color: late ? "var(--warn)" : "var(--good)" }}>{fmt(ui)}</b><small>UI thread في frame الضغطة</small></div>
        <div><b dir="ltr">{RASTER}ms</b><small>raster: الـ GPU مش المشكلة</small></div>
        <div><b>{missed}</b><small>vsync فاتوا من غير frame</small></div>
      </div>
      {late
        ? <div className="lab-warn">الـ frame خد {fmt(ui)}، يعني الشاشة وقفت قد {missed + 1} frames. الـ raster 4ms بس، فالمشكلة كود Dart على الـ main isolate.</div>
        : <div className="lab-warn" style={{ background: "var(--good-soft)", color: "var(--good)" }}>{fmt(ui)} جوه الميزانية. ومفيش ولا <code>Isolate.run</code>: الشغل ماكانش محتاج يتعمل أصلًا.</div>}

      <h3 style={{ fontSize: 16, margin: "16px 0 6px" }}>الـ CPU Profiler: Bottom Up</h3>
      <div dir="ltr" style={{ display: "grid", gap: 4 }}>
        {ranked.map((s) => (
          <div key={s.name} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 64px", gap: 8, alignItems: "center", fontSize: 13 }}>
            <div style={{ position: "relative", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", overflow: "hidden" }}>
              <span style={{ position: "absolute", inset: 0, width: `${Math.max(0.6, (s.ms / ui) * 100)}%`, background: s.color, opacity: 0.22 }} />
              <span style={{ position: "relative", display: "block", overflowWrap: "anywhere" }}>
                <span style={{ fontFamily: MONO, fontSize: 12.5 }}>{s.name}</span>
                {s.note && <> <bdi dir="rtl" style={{ color: "var(--muted)" }}>· {s.note}</bdi></>}
              </span>
            </div>
            <span style={{ fontFamily: MONO, color: "var(--muted)", textAlign: "right" }}>{fmt(s.ms)}</span>
          </div>
        ))}
      </div>
      <p className="lab-hint">أول سطر هو اللي يستاهل وقتك. الـ formatter أبطأ 17 مرة من المتخزن، بس الفرق كله {fmt(0.128 - 0.007)} في frame ميزانيته 16.7ms.</p>
    </>
  );
}

/* ---------- scenario 2: the Goodreads import, sync vs Future vs Isolate.run ---------- */

type Strategy = "sync" | "future" | "isolate";
const STRATEGIES: { id: Strategy; label: string; code: string }[] = [
  { id: "sync", label: "sync", code: "final rows = parseGoodreadsCsv(csv);" },
  { id: "future", label: "Future(() => …)", code: "final rows = await Future(() => parseGoodreadsCsv(csv));" },
  { id: "isolate", label: "Isolate.run", code: "final rows = await Isolate.run(() => parseGoodreadsCsv(File(path).readAsStringSync()));" },
];

const PARSE = 350;
const TAP = 30; // ms: the user taps "import"
const WINDOW = 520;
const FRAME_UI = 2.5; // the spinner animating
type Block = { from: number; ms: number; label: string; color: string };

function simulate(st: Strategy) {
  // work on the main isolate that is not a frame, in the order the event loop runs it
  const main: Block[] = [];
  const other: Block[] = [];
  let doneAt = 0;
  if (st === "sync") {
    main.push({ from: TAP, ms: 0.5, label: "onTap: emit(loading)", color: "var(--accent)" });
    main.push({ from: TAP + 0.5, ms: PARSE, label: "parseGoodreadsCsv", color: "var(--warn)" });
    doneAt = TAP + 0.5 + PARSE;
  } else if (st === "future") {
    main.push({ from: TAP, ms: 0.5, label: "onTap: emit(loading)", color: "var(--accent)" });
    // Future(...) is an event on the same loop: it runs at the next turn, before the next vsync
    main.push({ from: TAP + 1, ms: PARSE, label: "event: parseGoodreadsCsv", color: "var(--warn)" });
    doneAt = TAP + 1 + PARSE;
  } else {
    main.push({ from: TAP, ms: 1, label: "onTap: emit(loading) + Isolate.run (path بس)", color: "var(--accent)" });
    other.push({ from: TAP + 1, ms: PARSE, label: "readAsStringSync + parseGoodreadsCsv", color: "var(--good)" });
    doneAt = TAP + 1 + PARSE;
  }
  main.push({ from: doneAt, ms: 0.5, label: "emit(rows)", color: "var(--accent)" });

  // frames: a vsync every 16.7ms; it renders only if the main isolate is free at that moment
  const frames: { at: number; ok: boolean; ui: number }[] = [];
  let busyUntil = 0;
  const blocks = [...main].sort((a, b) => a.from - b.from);
  let bi = 0;
  for (let v = 0; v < WINDOW; v += BUDGET) {
    while (bi < blocks.length && blocks[bi].from <= v) {
      busyUntil = Math.max(busyUntil, blocks[bi].from) + blocks[bi].ms;
      bi++;
    }
    if (busyUntil > v) frames.push({ at: v, ok: false, ui: 0 });
    else {
      frames.push({ at: v, ok: true, ui: FRAME_UI });
      busyUntil = v + FRAME_UI;
    }
  }
  const longest = Math.max(...main.map((b) => b.ms));
  const dropped = frames.filter((f) => !f.ok).length;
  return { main, other, frames, longest, dropped };
}

function ImportScenario() {
  const [st, setSt] = useState<Strategy>("sync");
  const { main, other, frames, longest, dropped } = simulate(st);
  const pct = (ms: number) => `${(ms / WINDOW) * 100}%`;
  const s = STRATEGIES.find((x) => x.id === st)!;

  const lane = (title: string, blocks: Block[], empty: string, showFrames = false) => (
    <div style={{ display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", gap: 8, alignItems: "center", fontSize: 12.5 }}>
      <span style={{ color: "var(--muted)" }}>{title}</span>
      <div style={{ position: "relative", height: 26, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
        {frames.filter((f) => f.ok && showFrames).map((f) => (
          <span key={f.at} style={{ position: "absolute", top: 4, bottom: 4, left: pct(f.at), width: `max(2px, ${pct(f.ui)})`, background: "var(--accent)", opacity: 0.55, borderRadius: 2 }} />
        ))}
        {blocks.map((b) => (
          <span key={b.label} title={`${b.label}: ${fmt(b.ms)}`} style={{ position: "absolute", top: 2, bottom: 2, left: pct(b.from), width: `max(3px, ${pct(b.ms)})`, background: b.color, borderRadius: 4, color: "var(--surface)", fontFamily: MONO, fontSize: 11, lineHeight: "20px", paddingLeft: 6, overflow: "hidden", whiteSpace: "nowrap" }}>
            {b.ms >= 100 ? b.label : ""}
          </span>
        ))}
        {!blocks.length && <span style={{ position: "absolute", left: 8, top: 4, color: "var(--muted)" }}>{empty}</span>}
      </div>
    </div>
  );

  return (
    <>
      <p>استيراد Goodreads: ملف CSV فيه 3000 سطر، والـ <code>parseGoodreadsCsv</code> بياخد 350ms على موبايل متوسط. المستخدم داس «استورد» والـ spinner المفروض يلف. اختار الطريقة، وبص على الـ main isolate والـ frames.</p>
      <div className="lab-controls" role="radiogroup" aria-label="الطريقة">
        {STRATEGIES.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={st === x.id} dir="ltr"
            className={`chip-btn${st === x.id ? " active" : ""}`} onClick={() => setSt(x.id)}>{x.label}</button>
        ))}
      </div>
      <pre dir="ltr" style={{ margin: "8px 0", fontSize: 13, padding: "10px 14px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{s.code}</pre>

      <div dir="ltr" style={{ display: "grid", gap: 6, margin: "12px 0" }} aria-label="الخط الزمني للـ isolates">
        {lane("main", main, "", true)}
        {lane("isolate تاني", other, "مفيش")}
        <div style={{ display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", gap: 8, alignItems: "center", fontSize: 12.5 }}>
          <span style={{ color: "var(--muted)" }}>frames</span>
          <div style={{ display: "flex", gap: 2 }}>
            {frames.map((f) => (
              <span key={f.at} title={f.ok ? "frame اترسم" : "frame اتشال: الـ main مشغول"} style={{ flex: 1, height: 14, borderRadius: 3, background: f.ok ? "var(--good)" : "var(--warn)", opacity: f.ok ? 0.75 : 1 }} />
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", gap: 8, fontSize: 11, color: "var(--muted)", fontFamily: MONO }}>
          <span />
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>0ms</span><span>{WINDOW / 2}ms</span><span>{WINDOW}ms</span></div>
        </div>
      </div>

      <div className="lab-stats">
        <div><b dir="ltr" style={{ color: longest > BUDGET ? "var(--warn)" : "var(--good)" }}>{fmt(longest)}</b><small>أطول شغل على الـ main مرة واحدة</small></div>
        <div><b>{dropped}</b><small>frames اتشالت</small></div>
        <div><b>{st === "isolate" ? "بيلف" : "واقف"}</b><small>الـ spinner</small></div>
      </div>
      {st === "sync" && <div className="lab-warn">الـ parsing جوه الـ onTap نفسه: الـ main مشغول 350ms، يعني أكتر من 20 frame مااترسموش، وحتى الـ spinner اللي عملتله emit مالحقش يظهر.</div>}
      {st === "future" && <div className="lab-warn">نفس الـ 350ms ونفس الـ frames اللي اتشالت. الـ <code>Future(...)</code> حط الشغل في event تاني على نفس الـ event loop، وده بيشتغل غالبًا قبل الـ vsync الجاي. الـ async بيأجّل، مابيطلّعش الشغل من الـ thread.</div>}
      {st === "isolate" && <div className="lab-warn" style={{ background: "var(--good-soft)", color: "var(--good)" }}>الـ main بعت الـ path بس وفضي يرسم. الـ parsing على core تاني، والنتيجة رجعت بـ <code>Isolate.exit</code> من غير نسخ. ده الشغل اللي الـ isolate اتعمل عشانه: حساب واحد تقيل، مش حاجة ينفع تتعمل في الـ query أو مرة وقت الكتابة.</div>}
    </>
  );
}

export default function FrameBudgetLab() {
  const [tab, setTab] = useState<"status" | "import">("status");
  return (
    <section className="lab">
      <h2>ميزانية الـ frame: 16.7ms</h2>
      <div className="lab-controls" role="radiogroup" aria-label="السيناريو">
        <button type="button" role="radio" aria-checked={tab === "status"} className={`chip-btn${tab === "status" ? " active" : ""}`} onClick={() => setTab("status")}>تغيير حالة كتاب</button>
        <button type="button" role="radio" aria-checked={tab === "import"} className={`chip-btn${tab === "import" ? " active" : ""}`} onClick={() => setTab("import")}>استيراد Goodreads</button>
      </div>
      {tab === "status" ? <StatusScenario /> : <ImportScenario />}
    </section>
  );
}
