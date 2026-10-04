"use client";
import { useState } from "react";

type Step = { line: number | null; stack: string; micro: string[]; events: string[]; out: string; note: React.ReactNode };
type Program = { id: string; title: string; code: string[]; answer: string; steps: Step[] };

/** Hand-written traces: each step is a snapshot of the isolate after that line or task. */
const PROGRAMS: Program[] = [
  {
    id: "basics",
    title: "الطابورين",
    answer: "AFCDBE",
    code: [
      "void main() {",
      "  print('A');",
      "  Future(() => print('B'));",
      "  scheduleMicrotask(() => print('C'));",
      "  Future.value(1).then((_) => print('D'));",
      "  Timer.run(() => print('E'));",
      "  print('F');",
      "}",
    ],
    steps: [
      { line: 1, stack: "main()", micro: [], events: [], out: "A", note: "كود عادي: بيتنفذ فورًا." },
      { line: 2, stack: "main()", micro: [], events: ["B"], out: "A", note: <><code>Future(...)</code> بيحط الـ callback في الـ event queue. لسه ماشتغلش.</> },
      { line: 3, stack: "main()", micro: ["C"], events: ["B"], out: "A", note: <><code>scheduleMicrotask</code> بيحط في الـ microtask queue.</> },
      { line: 4, stack: "main()", micro: ["C", "D"], events: ["B"], out: "A", note: <>الـ <code>then</code> على Future خلصان أصلًا مابيشتغلش فورًا: بيتحط microtask.</> },
      { line: 5, stack: "main()", micro: ["C", "D"], events: ["B", "E"], out: "A", note: <><code>Timer.run</code> زي <code>Timer(Duration.zero)</code>: event.</> },
      { line: 6, stack: "main()", micro: ["C", "D"], events: ["B", "E"], out: "A F", note: "كود عادي تاني." },
      { line: 7, stack: "", micro: ["C", "D"], events: ["B", "E"], out: "A F", note: "main خلصت والـ stack فضي. الـ event loop بيبص على الـ microtasks الأول." },
      { line: null, stack: "microtask: C", micro: ["D"], events: ["B", "E"], out: "A F C", note: "أول microtask." },
      { line: null, stack: "microtask: D", micro: [], events: ["B", "E"], out: "A F C D", note: "الـ microtasks بتخلص كلها قبل أي event." },
      { line: null, stack: "event: B", micro: [], events: ["E"], out: "A F C D B", note: "الـ microtasks فضيت: event واحد بس، وبعده يرجع يبص على الـ microtasks." },
      { line: null, stack: "event: E", micro: [], events: [], out: "A F C D B E", note: "مفيش microtasks جديدة، فالـ event اللي بعده." },
    ],
  },
  {
    id: "await",
    title: "async وawait",
    answer: "ACBDFE",
    code: [
      "void main() {",
      "  print('A');",
      "  load();",
      "  print('B');",
      "}",
      "",
      "Future<void> load() async {",
      "  print('C');",
      "  await Future.value();",
      "  print('D');",
      "  Future(() => print('E'));",
      "  scheduleMicrotask(() => print('F'));",
      "}",
    ],
    steps: [
      { line: 1, stack: "main()", micro: [], events: [], out: "A", note: "كود عادي." },
      { line: 7, stack: "main() → load()", micro: [], events: [], out: "A C", note: "الـ async function بتشتغل عادي لحد أول await، من غير ما ترجع للي ناداها." },
      { line: 8, stack: "main() → load()", micro: ["باقي load()"], events: [], out: "A C", note: <>عند الـ <code>await</code> الـ function بتتعلّق وبترجّع Future. الـ Future هنا خلصان، فالكمالة بتتحط زي <code>then</code>: microtask.</> },
      { line: 3, stack: "main()", micro: ["باقي load()"], events: [], out: "A C B", note: <>رجعنا للـ main بعد <code>load()</code>، وبتكمّل.</> },
      { line: 4, stack: "", micro: ["باقي load()"], events: [], out: "A C B", note: "main خلصت." },
      { line: 9, stack: "microtask: باقي load()", micro: [], events: [], out: "A C B D", note: "الـ function بترجع تشتغل من بعد الـ await." },
      { line: 10, stack: "microtask: باقي load()", micro: [], events: ["E"], out: "A C B D", note: <><code>Future(...)</code>: event.</> },
      { line: 11, stack: "microtask: باقي load()", micro: ["F"], events: ["E"], out: "A C B D", note: "microtask جديدة اتضافت وإحنا جوه microtask." },
      { line: 12, stack: "", micro: ["F"], events: ["E"], out: "A C B D", note: "load خلصت. لسه في microtask." },
      { line: null, stack: "microtask: F", micro: [], events: ["E"], out: "A C B D F", note: "الـ microtask اللي اتضافت في النص بتشتغل برضه قبل الـ event." },
      { line: null, stack: "event: E", micro: [], events: [], out: "A C B D F E", note: "وفي الآخر الـ event." },
    ],
  },
  {
    id: "starve",
    title: "microtask جوه microtask",
    answer: "SM1M2T",
    code: [
      "void main() {",
      "  Timer.run(() => print('T'));",
      "  scheduleMicrotask(() {",
      "    print('M1');",
      "    scheduleMicrotask(() => print('M2'));",
      "  });",
      "  print('S');",
      "}",
    ],
    steps: [
      { line: 1, stack: "main()", micro: [], events: ["T"], out: "", note: "الـ timer اتسجّل الأول، بس في الـ event queue." },
      { line: 2, stack: "main()", micro: ["M1"], events: ["T"], out: "", note: "microtask." },
      { line: 6, stack: "main()", micro: ["M1"], events: ["T"], out: "S", note: "كود عادي." },
      { line: 7, stack: "", micro: ["M1"], events: ["T"], out: "S", note: "main خلصت." },
      { line: 3, stack: "microtask: M1", micro: [], events: ["T"], out: "S M1", note: "M1 بتشتغل." },
      { line: 4, stack: "microtask: M1", micro: ["M2"], events: ["T"], out: "S M1", note: "M1 حطت microtask جديدة." },
      { line: null, stack: "microtask: M2", micro: [], events: ["T"], out: "S M1 M2", note: "الطابور لازم يفضى خالص قبل أي event، حتى لو اتملى وهو بيفضى. لو M2 كانت بتحط microtask لنفسها كل مرة، T عمرها ماكانت هتشتغل، ولا أي frame." },
      { line: null, stack: "event: T", micro: [], events: [], out: "S M1 M2 T", note: "دلوقتي بس الـ timer، مع إنه اتسجّل الأول." },
    ],
  },
];

const BOX: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "8px 12px", minHeight: 74 };
const CHIP = (bg: string): React.CSSProperties => ({ display: "inline-block", fontFamily: "IBM Plex Mono, monospace", fontSize: 13, padding: "1px 10px", borderRadius: 99, background: bg, border: "1px solid var(--line)", margin: "2px 4px 2px 0" });
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export default function EventLoopLab() {
  const [pid, setPid] = useState(PROGRAMS[0].id);
  const [i, setI] = useState(-1); // -1: before the first line
  const [guess, setGuess] = useState("");
  const p = PROGRAMS.find((x) => x.id === pid)!;
  const step = i >= 0 ? p.steps[i] : null;
  const done = i === p.steps.length - 1;

  const pick = (id: string) => { setPid(id); setI(-1); setGuess(""); };
  const right = norm(guess) === norm(p.answer);

  return (
    <section className="lab">
      <h2>الـ event loop خطوة بخطوة</h2>
      <p>اختار برنامج، واكتب الترتيب اللي متوقع يتطبع قبل ما تبدأ. وبعدين دوس «الخطوة الجاية»، وشوف كل سطر بيحط إيه في أنهي طابور، والـ event loop بيختار مين امتى.</p>

      <div className="lab-controls" role="radiogroup" aria-label="البرنامج">
        {PROGRAMS.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={pid === x.id}
            className={`chip-btn${pid === x.id ? " active" : ""}`} onClick={() => pick(x.id)}>{x.title}</button>
        ))}
      </div>

      <div className="lab-controls">
        <input className="lab-input" dir="ltr" placeholder="A B C ..." aria-label="تخمينك للترتيب" style={{ maxWidth: 240, fontFamily: "IBM Plex Mono, monospace" }}
          value={guess} onChange={(e) => setGuess(e.target.value)} disabled={i >= 0} />
        <button className="btn" type="button" onClick={() => setI((n) => Math.min(n + 1, p.steps.length - 1))} disabled={done}>الخطوة الجاية</button>
        <button className="btn ghost" type="button" onClick={() => setI(p.steps.length - 1)} disabled={done}>للآخر</button>
        <button className="btn ghost" type="button" onClick={() => setI(-1)}>من الأول</button>
      </div>

      <pre dir="ltr" style={{ margin: "10px 0", fontSize: 13.5, lineHeight: 1.7, padding: "10px 0", borderRadius: 12 }}>
        {p.code.map((l, n) => (
          <div key={n} style={{ padding: "0 14px", background: step?.line === n ? "var(--accent-soft)" : undefined, color: step?.line === n ? "var(--ink)" : undefined, whiteSpace: "pre" }}>
            {l || " "}
          </div>
        ))}
      </pre>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <div style={BOX}>
          <small style={{ color: "var(--muted)" }}>شغال دلوقتي (call stack)</small>
          <div dir="ltr" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13.5, marginTop: 4 }}>{step?.stack || "—"}</div>
        </div>
        <div style={BOX}>
          <small style={{ color: "var(--muted)" }}>microtask queue</small>
          <div dir="ltr">{step?.micro.length ? step.micro.map((m, n) => <span key={n} style={CHIP("var(--accent-soft)")}>{m}</span>) : "—"}</div>
        </div>
        <div style={BOX}>
          <small style={{ color: "var(--muted)" }}>event queue</small>
          <div dir="ltr">{step?.events.length ? step.events.map((m, n) => <span key={n} style={CHIP("var(--warn-soft)")}>{m}</span>) : "—"}</div>
        </div>
      </div>

      <div className="lab-stats">
        <div className="wide"><b dir="ltr" style={{ fontFamily: "IBM Plex Mono, monospace" }}>{step?.out || "—"}</b><small>اللي اتطبع لحد دلوقتي</small></div>
        <div><b dir="ltr">{i + 1} / {p.steps.length}</b><small>الخطوة</small></div>
      </div>
      <p className="lab-hint" style={{ minHeight: 28 }}>{step ? step.note : "دوس «الخطوة الجاية» عشان تبدأ."}</p>

      {done && guess.trim() !== "" && (
        right
          ? <div className="lab-warn" style={{ background: "var(--good-soft)", color: "var(--good)" }}>تخمينك صح.</div>
          : <div className="lab-warn">تخمينك <span dir="ltr">{norm(guess)}</span> والترتيب الحقيقي <span dir="ltr">{p.answer}</span>. ارجع للخطوة اللي اختلفت فيها واقرا الملاحظة بتاعتها.</div>
      )}
    </section>
  );
}
