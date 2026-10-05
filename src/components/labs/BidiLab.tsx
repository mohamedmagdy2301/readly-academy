"use client";
import { useState } from "react";
import Switch from "./Switch";

const MONO = "IBM Plex Mono, monospace";
const FSI = "⁨";
const PDI = "⁩";
const isolate = (text: string) => `${FSI}${text}${PDI}`;

const TEMPLATES = [
  { id: "finishedBook", ar: "خلّصت {title}", hint: "الـ snackbar لما تخلّص كتاب", samples: ["Who Moved My Cheese?", "Harry Potter (Book 1)", "C++ Primer", "Atomic Habits"] },
  { id: "byAuthor", ar: "تأليف {author}", hint: "هيدر صفحة الكتاب", samples: ["J.R.R. Tolkien", "Robert C. Martin", "(Anonymous)", "أحمد خالد توفيق"] },
] as const;

/* A port of intl's Bidi.estimateDirectionOfText: by word count, with a 40% threshold. */
const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const LTR_CHAR = /[A-Za-zÀ-ʸ̀-֐ࠀ-῿Ⰰ-﬜﷾-﹯﻽-￿]/;
function startsWithRtl(word: string) {
  for (const ch of word) {
    if (RTL_CHAR.test(ch)) return true;
    if (LTR_CHAR.test(ch)) return false;
  }
  return false;
}
function detectRtl(text: string) {
  let rtl = 0;
  let total = 0;
  for (const w of text.split(/\s+/)) {
    if (!w) continue;
    if (startsWithRtl(w)) { rtl++; total++; }
    else if (LTR_CHAR.test(w)) total++;
  }
  return total > 0 && rtl > 0.4 * total;
}

/** The String in memory order, with the invisible isolate characters shown as chips. */
function Visible({ prefix, value, iso }: { prefix: string; value: string; iso: boolean }) {
  const chip = (label: string) => (
    <span style={{ background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 4, padding: "0 4px", margin: "0 2px", fontSize: 11 }}>{label}</span>
  );
  return (
    <span dir="ltr" style={{ fontFamily: MONO, fontSize: 13, overflowWrap: "anywhere" }}>
      &apos;<bdi dir="rtl">{prefix}</bdi>{" "}{iso && chip("\\u2068")}<bdi dir="ltr">{value}</bdi>{iso && chip("\\u2069")}&apos;
    </span>
  );
}

const CARD: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px", margin: "8px 0" };
const ok = (good: boolean) => ({ color: good ? "var(--good)" : "var(--warn)", fontWeight: 600 } as const);

function MixedSentence() {
  const [tid, setTid] = useState<(typeof TEMPLATES)[number]["id"]>("finishedBook");
  const t = TEMPLATES.find((x) => x.id === tid)!;
  const [value, setValue] = useState<string>(t.samples[0]);
  const [iso, setIso] = useState(false);
  const placeholder = tid === "finishedBook" ? "{title}" : "{author}";
  const arg = iso ? isolate(value) : value;
  const sentence = t.ar.replace(placeholder, arg);
  const call = tid === "finishedBook"
    ? `l10n.finishedBook(${iso ? "isolate(book.title)" : "book.title"})`
    : `l10n.byAuthor(${iso ? "isolate(authorName)" : "authorName"})`;

  const pick = (id: typeof tid) => { setTid(id); setValue(TEMPLATES.find((x) => x.id === id)!.samples[0]); };

  return (
    <>
      <h3 style={{ fontSize: 16, margin: "14px 0 4px" }}>1. data جوه جملة مترجمة</h3>
      <div className="lab-controls" role="radiogroup" aria-label="الجملة">
        {TEMPLATES.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={tid === x.id}
            className={`chip-btn${tid === x.id ? " active" : ""}`} onClick={() => pick(x.id)}>{x.hint}</button>
        ))}
      </div>
      <div className="lab-controls">
        <input className="lab-input" dir="auto" aria-label="القيمة اللي جاية من الـ data" value={value} onChange={(e) => setValue(e.target.value)} style={{ maxWidth: 300 }} />
        <Switch checked={iso} onChange={setIso}><code>isolate()</code></Switch>
      </div>
      <div className="lab-controls" style={{ marginTop: 0 }}>
        {t.samples.map((s) => (
          <button key={s} type="button" className="chip-btn" dir={RTL_CHAR.test(s) ? "rtl" : "ltr"} onClick={() => setValue(s)}>{s}</button>
        ))}
      </div>
      <div style={CARD}>
        <small style={{ color: "var(--muted)" }}>على الشاشة (فقرة RTL، زي الـ <code>Text</code> في app عربي)</small>
        <p dir="rtl" style={{ fontSize: 20, margin: "6px 0 4px", unicodeBidi: "isolate" }}>{sentence}</p>
      </div>
      <div style={{ ...CARD, display: "grid", gap: 4 }}>
        <small style={{ color: "var(--muted)" }}>الكود، والـ String بترتيبه في الذاكرة</small>
        <code dir="ltr" style={{ fontFamily: MONO, fontSize: 13, wordBreak: "break-word" }}>{call}</code>
        <Visible prefix={t.ar.replace(placeholder, "").trim()} value={value} iso={iso} />
      </div>
      <p className="lab-hint" style={{ marginTop: 4 }}>
        {iso
          ? <>الـ <code>U+2068</code> بيقول «احسب اتجاه اللي جوايا من أول حرف strong فيه»، والـ <code>U+2069</code> بيقفل. علامات الترقيم بقت جوه الـ isolate، فبتفضل مع العنوان.</>
          : <>الـ <code>?</code> والـ <code>(</code> <code>)</code> والنقط neutral: لو على حدود run إنجليزي وآخر الفقرة، بياخدوا اتجاه الفقرة (RTL) وبيتنقلوا ناحية الشمال. جرّب العنوان اللي فيه قوس، وبعدين شغّل الـ isolate.</>}
      </p>
    </>
  );
}

function UserContent() {
  const [note, setNote] = useState("Great chapter on habits. Re-read p. 42!");
  const [detect, setDetect] = useState(false);
  const [email, setEmail] = useState("ali@mail.com");
  const [emailLtr, setEmailLtr] = useState(false);
  const noteDir = detect ? (note.trim() === "" ? "rtl" : detectRtl(note) ? "rtl" : "ltr") : "rtl";

  return (
    <>
      <h3 style={{ fontSize: 16, margin: "18px 0 4px" }}>2. محتوى المستخدم والإيميل</h3>
      <div className="lab-controls">
        <Switch checked={detect} onChange={setDetect}><code>contentDirection(note.body, …)</code></Switch>
        <Switch checked={emailLtr} onChange={setEmailLtr}><code>textDirection: TextDirection.ltr</code> للإيميل</Switch>
      </div>
      <textarea className="lab-input" dir="auto" rows={2} aria-label="اكتب ملاحظة" value={note} onChange={(e) => setNote(e.target.value)} style={{ maxWidth: "100%", boxSizing: "border-box", resize: "vertical" }} />
      <div style={{ ...CARD, borderStartStartRadius: 2 }}>
        <small style={{ color: "var(--muted)" }}>NoteCard · <span dir="ltr">textDirection: {detect ? `TextDirection.${noteDir}` : "Directionality.of(context)"}</span></small>
        <p dir={noteDir} style={{ margin: "6px 0 0", textAlign: "start", fontSize: 16.5 }}>{note || " "}</p>
      </div>
      <div style={CARD}>
        <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }} htmlFor="bidi-email">الإيميل (الـ label بيفضل عربي)</label>
        <input id="bidi-email" className="lab-input" type="text" inputMode="email" dir={emailLtr ? "ltr" : "rtl"} value={email} onChange={(e) => setEmail(e.target.value)} style={{ maxWidth: 300, textAlign: "start" }} />
        <small style={{ display: "block", marginTop: 4, ...ok(emailLtr) }}>{emailLtr ? "الإيميل LTR دايمًا، والـ cursor بيبدأ من الشمال." : "الحقل RTL: امسحه واكتبه تاني، وبص على الـ @ والـ . وهما بيتنطّوا."}</small>
      </div>
    </>
  );
}

type Icon = "chevron_right" | "if_rtl" | "keyboard_arrow_right";
const ICONS: { id: Icon; code: string }[] = [
  { id: "chevron_right", code: "Icons.chevron_right" },
  { id: "if_rtl", code: "isArabic ? Icons.chevron_left : Icons.chevron_right" },
  { id: "keyboard_arrow_right", code: "Icons.keyboard_arrow_right" },
];

/** Which way the arrow ends up pointing, the way Flutter draws it. */
function pointsLeft(icon: Icon, rtl: boolean) {
  if (icon === "keyboard_arrow_right") return false; // matchTextDirection: false
  const base = icon === "if_rtl" && rtl ? "left" : "right";
  const mirrored = rtl; // chevron_* has matchTextDirection: true
  return (base === "left") !== mirrored;
}

function Chevron({ left }: { left: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: left ? "scaleX(-1)" : undefined, flex: "none" }}>
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Directional() {
  const [rtl, setRtl] = useState(true);
  const [physical, setPhysical] = useState(true);
  const [icon, setIcon] = useState<Icon>("if_rtl");
  const left = pointsLeft(icon, rtl);
  const iconOk = left === rtl; // "forward" points to the end side
  const stripe: React.CSSProperties = physical
    ? { borderLeft: "4px solid var(--good)", paddingLeft: 12, paddingRight: 16, textAlign: "left" }
    : { borderInlineStart: "4px solid var(--good)", paddingInlineStart: 12, paddingInlineEnd: 16, textAlign: "start" };
  const stripeOk = !physical || !rtl;

  return (
    <>
      <h3 style={{ fontSize: 16, margin: "18px 0 4px" }}>3. left/right ولا start/end</h3>
      <div className="lab-controls" role="radiogroup" aria-label="لغة الـ app">
        <button type="button" role="radio" aria-checked={rtl} className={`chip-btn${rtl ? " active" : ""}`} onClick={() => setRtl(true)}>عربي (RTL)</button>
        <button type="button" role="radio" aria-checked={!rtl} className={`chip-btn${!rtl ? " active" : ""}`} onClick={() => setRtl(false)}>English (LTR)</button>
        <Switch checked={physical} onChange={setPhysical}>physical: <code>left</code> بدل <code>start</code></Switch>
      </div>
      <div className="lab-controls" role="radiogroup" aria-label="أيقونة «التالي»">
        {ICONS.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={icon === x.id} dir="ltr"
            className={`chip-btn${icon === x.id ? " active" : ""}`} onClick={() => setIcon(x.id)} style={{ fontFamily: MONO, fontSize: 12.5 }}>{x.code}</button>
        ))}
      </div>

      <div dir={rtl ? "rtl" : "ltr"} style={{ ...CARD, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", ...stripe }}>
          <div style={{ flex: 1, minWidth: 0, textAlign: stripe.textAlign }}>
            <b style={{ display: "block" }}>{rtl ? "العادات الذرية" : "Atomic Habits"}</b>
            <small style={{ color: "var(--muted)" }}>{rtl ? "كمّل القراية" : "Continue reading"}</small>
          </div>
          <span style={{ background: "var(--good-soft)", color: "var(--good)", borderRadius: 99, padding: "1px 10px", fontSize: 13, flex: "none" }}>{rtl ? "بقراه" : "Reading"}</span>
          <span style={{ color: iconOk ? "var(--ink)" : "var(--warn)", display: "inline-flex" }}><Chevron left={left} /></span>
        </div>
      </div>
      <p className="lab-hint" style={{ margin: "4px 0 0" }} dir="ltr">
        <code>{physical ? "Border(left: …) · EdgeInsets.only(left: 12) · TextAlign.left" : "BorderDirectional(start: …) · EdgeInsetsDirectional.only(start: 12) · TextAlign.start"}</code>
      </p>
      <ul style={{ margin: "6px 0 0", paddingInlineStart: 18, fontSize: 14.5 }}>
        <li><span style={ok(stripeOk)}>{stripeOk ? "✓" : "✗"}</span> الشريط والـ padding {physical ? (rtl ? "ناحية الشمال في العربي، يعني النهاية، والعنوان لازق شمال." : "ناحية الشمال، وده صح في الإنجليزي بالصدفة.") : "ناحية البداية في اللغتين، من غير ولا if."}</li>
        <li><span style={ok(iconOk)}>{iconOk ? "✓" : "✗"}</span> السهم بيشاور {left ? "شمال" : "يمين"}{" "}
          {icon === "if_rtl" && rtl && "— اتقلب مرتين: مرة بالـ if ومرة بـ Flutter (matchTextDirection)."}
          {icon === "keyboard_arrow_right" && rtl && "— الأيقونة دي مابتتقلبش، فبتشاور لورا في العربي."}
          {icon === "chevron_right" && "— بتتقلب لوحدها، ومعناها «قدام» في الاتجاهين."}
          {!rtl && icon !== "chevron_right" && "— صح في الإنجليزي، وده بالظبط ليه الـ bug بيعدّي لو بتجرّب بالإنجليزي بس."}
        </li>
      </ul>
    </>
  );
}

export default function BidiLab() {
  return (
    <section className="lab">
      <h2>الـ RTL والنص المختلط</h2>
      <p>كل حاجة هنا بتترسم بالـ bidi algorithm الحقيقي بتاع المتصفح، وهو نفس الـ Unicode Bidirectional Algorithm اللي الـ text engine بتاع Flutter ماشي عليه. غيّر القيمة، وشغّل وطفّي الحل، وبص على علامات الترقيم والأسهم.</p>
      <MixedSentence />
      <UserContent />
      <Directional />
    </section>
  );
}
