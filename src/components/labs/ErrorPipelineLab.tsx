"use client";
import { useState } from "react";
import { sleep } from "./useLog";
import Switch from "./Switch";

type Tone = "ok" | "bad" | "mute";
type Stage = { code: string; text: string; tone: Tone };
type Outcome = { source: Stage; guard: Stage; cubit: Stage; ui: Stage; report: Stage };
type Scenario = { id: string; label: string; full: Outcome; old?: Partial<Outcome> };

const REQUEST = "POST /books/OL45804W/notes";

const noReport: Stage = { code: "—", text: "مفيش تقرير: ده مش bug، ده العالم الخارجي.", tone: "mute" };

const SCENARIOS: Scenario[] = [
  {
    id: "ok",
    label: "201 نجاح",
    full: {
      source: { code: "Response 201 Created", text: "السيرفر حفظ الملاحظة ورجّعها.", tone: "ok" },
      guard: { code: "Success(Note)", text: "مفيش exception، فالـ guard بيلف القيمة في Success.", tone: "ok" },
      cubit: { code: "NotesState(notes: [..., note])", text: "الـ Cubit بيضيف الملاحظة للـ state.", tone: "ok" },
      ui: { code: "list + 1", text: "الملاحظة ظهرت في الليستة.", tone: "ok" },
      report: { code: "—", text: "مفيش حاجة تتسجل.", tone: "mute" },
    },
  },
  {
    id: "offline",
    label: "مفيش نت",
    full: {
      source: { code: "DioException.connectionError", text: "جواه SocketException: Failed host lookup. الطلب ماخرجش من الموبايل أصلًا.", tone: "bad" },
      guard: { code: "Err(NetworkFailure())", text: "الـ _mapDio بيحوّل أي مشكلة اتصال لـ NetworkFailure.", tone: "ok" },
      cubit: { code: "status: failure, failure: NetworkFailure", text: "الملاحظة اللي المستخدم كتبها فاضلة في الـ state، مااتمسحتش.", tone: "ok" },
      ui: { code: "SnackBar + «حاول تاني»", text: "«مفيش اتصال بالإنترنت. الملاحظة ماتحفظتش، جرّب تاني.» والزرار ظاهر لأن canRetry = true.", tone: "ok" },
      report: noReport,
    },
  },
  {
    id: "timeout",
    label: "receiveTimeout",
    full: {
      source: { code: "DioException.receiveTimeout", text: "الطلب وصل، والرد ماجاش في 15 ثانية. ممكن السيرفر يكون حفظ الملاحظة فعلًا.", tone: "bad" },
      guard: { code: "Err(NetworkFailure())", text: "الـ timeouts كلها من النت غالبًا، فبتبقى NetworkFailure.", tone: "ok" },
      cubit: { code: "status: failure, failure: NetworkFailure", text: "نفس حالة «مفيش نت».", tone: "ok" },
      ui: { code: "SnackBar + «حاول تاني»", text: "«النت بطيء والملاحظة ماتأكدتش. جرّب تاني.» والـ retry آمن بس لو الطلب معاه Idempotency-Key.", tone: "ok" },
      report: noReport,
    },
    old: {
      guard: { code: "Err(ServerFailure(statusCode: null))", text: "الـ _mapDio القديم بيعرف connectionError وconnectionTimeout بس، فالـ receiveTimeout وقع في الـ _.", tone: "bad" },
      ui: { code: "SnackBar", text: "«حصلت مشكلة في السيرفر.» والمشكلة في النت مش في السيرفر: المستخدم اتضلل.", tone: "bad" },
    },
  },
  {
    id: "401",
    label: "401 والـ refresh اترفض",
    full: {
      source: { code: "DioException.badResponse (401)", text: "الـ AuthInterceptor جرّب refresh مرة، والسيرفر رفض الـ refresh token، فالـ tokens اتمسحت.", tone: "bad" },
      guard: { code: "Err(UnauthorizedFailure())", text: "الـ 401 مابيوصلش هنا غير لما الـ refresh يفشل فعلًا.", tone: "ok" },
      cubit: { code: "status: failure, failure: UnauthorizedFailure", text: "الشاشة مش هتتصرف: الـ AuthCubit شاف الـ session خلصت.", tone: "ok" },
      ui: { code: "redirect → /login", text: "مفيش رسالة في شاشة الملاحظات. الـ router بيحوّل لصفحة الدخول مرة واحدة للـ app كله.", tone: "ok" },
      report: noReport,
    },
  },
  {
    id: "422",
    label: "422 أخطاء حقول",
    full: {
      source: { code: "DioException.badResponse (422)", text: "الـ body: {code: validation_failed, fields: {text: too_long}}", tone: "bad" },
      guard: { code: "Err(ServerFailure(422, code: validation_failed, fieldErrors: {text: too_long}))", text: "الـ guard قرا الـ body بالـ patterns وحط الحقول كبيانات.", tone: "ok" },
      cubit: { code: "status: editing, serverErrors: {text: too_long}", text: "الفورم يفضل مفتوح بالنص اللي اتكتب.", tone: "ok" },
      ui: { code: "error تحت حقل النص", text: "«الملاحظة أطول من المسموح.» تحت الحقل نفسه، ومفيش «حاول تاني» لأن نفس الطلب هيرجع نفس الـ 422.", tone: "ok" },
      report: noReport,
    },
    old: {
      guard: { code: "Err(ServerFailure(statusCode: 422))", text: "الـ _mapDio القديم رمى الـ body، فالـ code والحقول ضاعوا.", tone: "bad" },
      cubit: { code: "status: failure", text: "الـ Cubit مش عارف أنهي حقل غلط.", tone: "bad" },
      ui: { code: "SnackBar عام", text: "«حصلت مشكلة في السيرفر.» والمستخدم مش عارف يصلّح إيه.", tone: "bad" },
    },
  },
  {
    id: "429",
    label: "429 + Retry-After",
    full: {
      source: { code: "DioException.badResponse (429)", text: "Retry-After: 60. الـ RetryInterceptor مااستناش لأن الـ 60 ثانية أطول من الحد بتاعه (30).", tone: "bad" },
      guard: { code: "Err(ServerFailure(429, retryAfter: 60s))", text: "الـ guard قرا الـ header وحطه في الـ Failure.", tone: "ok" },
      cubit: { code: "status: failure, failure: ServerFailure(429)", text: "الملاحظة فاضلة في الـ state.", tone: "ok" },
      ui: { code: "SnackBar + عدّاد", text: "«بعت طلبات كتير. جرّب تاني بعد دقيقة.» والزرار بيرجع بعد الوقت ده.", tone: "ok" },
      report: noReport,
    },
    old: {
      guard: { code: "Err(ServerFailure(statusCode: 429))", text: "الـ Retry-After ضاع.", tone: "bad" },
      ui: { code: "SnackBar + «حاول تاني»", text: "المستخدم بيضغط على طول، وكل ضغطة بتطوّل الحظر.", tone: "bad" },
    },
  },
  {
    id: "500",
    label: "500 من السيرفر",
    full: {
      source: { code: "DioException.badResponse (500)", text: "X-Request-Id: req_7f3a91c2. الـ RetryInterceptor مابيعيدش 500: غالبًا bug في السيرفر.", tone: "bad" },
      guard: { code: "Err(ServerFailure(500, requestId: req_7f3a91c2))", text: "الـ requestId اتقرا من الـ header.", tone: "ok" },
      cubit: { code: "status: failure, failure: ServerFailure(500)", text: "الملاحظة فاضلة في الـ state.", tone: "ok" },
      ui: { code: "SnackBar + رقم المرجع", text: "«حصلت مشكلة عندنا. رقم المرجع: req_7f3a91c2.» الدعم يلاقي الطلب بالظبط في logs السيرفر.", tone: "ok" },
      report: { code: "breadcrumb", text: "مش crash في الـ app. السيرفر سجّل الخطأ بنفس الـ requestId.", tone: "mute" },
    },
    old: {
      guard: { code: "Err(ServerFailure(statusCode: 500))", text: "مفيش requestId.", tone: "bad" },
      ui: { code: "SnackBar", text: "«حصلت مشكلة في السيرفر.» والدعم مش هيعرف يلاقي الطلب.", tone: "bad" },
    },
  },
  {
    id: "html",
    label: "HTML من WiFi الكافيه",
    full: {
      source: { code: "DioException.badResponse (UnexpectedBodyException)", text: "الـ WiFi رد بصفحة login بتاعته بـ 200 وcontent-type: text/html. الـ JsonOnlyInterceptor رفضها قبل أي parse.", tone: "bad" },
      guard: { code: "Err(NetworkFailure(hint: captivePortal))", text: "الرد ماجاش من الـ API أصلًا: دي مشكلة شبكة، مش سيرفر ومش bug.", tone: "ok" },
      cubit: { code: "status: failure, failure: NetworkFailure", text: "الملاحظة فاضلة في الـ state.", tone: "ok" },
      ui: { code: "SnackBar + «حاول تاني»", text: "«الشبكة دي محتاجة تسجيل دخول. افتح المتصفح وسجّل، وبعدين جرّب تاني.»", tone: "ok" },
      report: noReport,
    },
    old: {
      source: { code: "TypeError", text: "dio رجّع الـ HTML كـ String، والـ fromJson رمى: 'String' is not a subtype of 'Map<String, dynamic>'.", tone: "bad" },
      guard: { code: "TypeError عدّى", text: "الـ guard القديم بيمسك DioException وCacheException بس، فالـ TypeError طلع منه.", tone: "bad" },
      cubit: { code: "status: saving (للأبد)", text: "الـ emit اللي بعد الـ await ماتنفذش.", tone: "bad" },
      ui: { code: "spinner مابيقفش", text: "المستخدم شايف loading لحد ما يقفل الـ app.", tone: "bad" },
      report: { code: "crash: TypeError", text: "Sentry بيقول crash في الـ app، والمشكلة في الشبكة.", tone: "bad" },
    },
  },
  {
    id: "shape",
    label: "الـ JSON شكله اتغير",
    full: {
      source: { code: "Response 201 Created", text: "الـ backend غيّر اسم الحقل من text لـ body. الـ fromJson رمى TypeError، والـ parseOrThrow في الـ data source لفّه في ParseException.", tone: "bad" },
      guard: { code: "Err(ServerFailure(code: bad_response))", text: "العقد اتكسر، بس ده مش bug في الـ app: الـ guard بيحوّله Failure.", tone: "ok" },
      cubit: { code: "status: failure", text: "الملاحظة فاضلة في الـ state.", tone: "ok" },
      ui: { code: "SnackBar", text: "«حصلت مشكلة. جرّب تاني بعد شوية.»", tone: "ok" },
      report: { code: "non-fatal: ParseException", text: "بالـ endpoint ونسخة الـ app، فالفريق يعرف إن العقد اتكسر قبل ما المستخدمين يشتكوا.", tone: "ok" },
    },
    old: {
      source: { code: "TypeError", text: "Null is not a subtype of String.", tone: "bad" },
      guard: { code: "TypeError عدّى", text: "طلع من الـ guard.", tone: "bad" },
      cubit: { code: "status: saving (للأبد)", text: "الـ Cubit عمره ما خرج من الـ loading.", tone: "bad" },
      ui: { code: "spinner مابيقفش", text: "ومفيش أي رسالة.", tone: "bad" },
      report: { code: "crash: TypeError", text: "crash من غير سياق: مين الـ endpoint؟", tone: "bad" },
    },
  },
  {
    id: "cancel",
    label: "المستخدم قفل الشاشة",
    full: {
      source: { code: "DioException.cancel", text: "الطلب اتلغى عن قصد.", tone: "mute" },
      guard: { code: "Err(ServerFailure(code: cancelled))", text: "الإلغاء بيعدّي كـ Failure زي أي حاجة، بس محدش بيعرضه.", tone: "mute" },
      cubit: { code: "closed", text: "الـ Cubit اتقفل، ومفيش emit.", tone: "mute" },
      ui: { code: "—", text: "مفيش حاجة تتعرض: الشاشة مش موجودة أصلًا.", tone: "mute" },
      report: noReport,
    },
  },
];

const STAGES: { key: keyof Outcome; name: string }[] = [
  { key: "source", name: "الـ data source (dio)" },
  { key: "guard", name: "الـ guard في الـ repository" },
  { key: "cubit", name: "الـ Cubit" },
  { key: "ui", name: "الشاشة" },
  { key: "report", name: "Sentry" },
];

export default function ErrorPipelineLab() {
  const [picked, setPicked] = useState("422");
  const [full, setFull] = useState(true);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Outcome | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === picked)!;

  async function run() {
    const outcome = { ...scenario.full, ...(full ? {} : scenario.old) };
    setBusy(true); setResult(outcome); setShown(0);
    for (let i = 1; i <= STAGES.length; i++) {
      await sleep(450);
      setShown(i);
    }
    setBusy(false);
  }

  const changed = (key: keyof Outcome) => !full && scenario.old?.[key] !== undefined;

  return (
    <section className="lab">
      <h2>من الـ request للشاشة</h2>
      <p>
        المستخدم ضاف ملاحظة، والطلب <code dir="ltr">{REQUEST}</code> خرج. اختار إيه اللي حصل في السكة، وشوف الخطأ بيتحول إزاي في كل طبقة. وبعدين اقفل «الـ _mapDio الكامل» وشغّل نفس الحالة بالنسخة الأولى من درس الأخطاء في الوحدة 2.
      </p>
      <div className="lab-controls" role="radiogroup" aria-label="السيناريو">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={picked === s.id}
            className={`chip-btn${picked === s.id ? " active" : ""}`}
            onClick={() => { setPicked(s.id); setResult(null); setShown(0); }}
            disabled={busy}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="lab-controls">
        <Switch checked={full} onChange={(v) => { setFull(v); setResult(null); setShown(0); }}>الـ _mapDio الكامل</Switch>
        <button className="btn" type="button" onClick={run} disabled={busy}>ابعت الطلب</button>
      </div>
      {result && (
        <ol className="pipe" aria-live="polite">
          {STAGES.map((st, i) => {
            const s = result[st.key];
            const visible = i < shown;
            return (
              <li key={st.key} className={visible ? s.tone : "wait"}>
                <small>{st.name}{visible && changed(st.key) ? " · النسخة القديمة" : ""}</small>
                {visible ? (
                  <>
                    <code dir="ltr">{s.code}</code>
                    <p>{s.text}</p>
                  </>
                ) : <p>…</p>}
              </li>
            );
          })}
        </ol>
      )}
      {!full && !scenario.old && (
        <p className="lab-hint">الحالة دي النسخة القديمة كانت بتتعامل معاها صح. جرّب receiveTimeout أو 422 أو HTML.</p>
      )}
    </section>
  );
}
