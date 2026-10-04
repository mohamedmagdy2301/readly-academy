import type { MDXComponents } from "mdx/types";
import Diagram from "./Diagram";
import Pre from "./Pre";
import Question from "./Question";
import Task from "./Task";
import Lab from "./labs";
import LogBox from "./LogBox";

/* ---------- small presentational blocks used inside the MDX content ---------- */

const LEVELS: Record<string, string> = { "1": "مبتدئ", "2": "متوسط", "3": "متقدم", "4": "احترافي" };

/** Levels 1-2 open by default, 3-4 collapsed so a first read stays short. */
function Level({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <details className={`level l${n}`} open={n === "1" || n === "2"}>
      <summary className="lvl-head"><span className={`badge b${n}`}>{LEVELS[n]}</span><h3>{title}</h3><span className="lvl-toggle" aria-hidden="true" /></summary>
      <div className="lvl-body">{children}</div>
    </details>
  );
}

/** A titled block inside a lesson (e.g. "قبل وبعد والكود"). */
const LessonPart = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="lesson-part"><h2 className="part-title">{title}</h2>{children}</section>
);

function LevelLegend() {
  return (
    <div className="legend">
      <span className="badge b1">مبتدئ</span> الفكرة بتشبيه من الحياة، من غير كود تقريبًا.{" "}
      <span className="badge b2">متوسط</span> الكود الأساسي وإزاي تكتبه.{" "}
      <span className="badge b3">متقدم</span> التفاصيل والحالات الصعبة.{" "}
      <span className="badge b4">احترافي</span> الـ trade-offs والأخطاء الشائعة وأسئلة الـ interviews.
    </div>
  );
}

const Analogy = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="analogy"><b>تشبيه: {title}</b>{children}</div>
);

const Note = ({ kind = "info", title, children }: { kind?: "info" | "warn" | "interview"; title: string; children: React.ReactNode }) => (
  <div className={`note ${kind}`}><b>{title}</b>{children}</div>
);

const CodeBlock = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="code-labeled"><span className="code-label">{label}</span>{children}</div>
);

const Quiz = ({ children }: { children: React.ReactNode }) => (
  <div className="quiz"><h4>اختبر نفسك</h4>{children}</div>
);
const Ask = ({ children }: { children: React.ReactNode }) => <summary>{children}</summary>;
const Answer = ({ children }: { children: React.ReactNode }) => <div className="qa-answer">{children}</div>;

const Tasks = ({ children }: { children: React.ReactNode }) => <ul className="tasks tasks-block">{children}</ul>;
const Deliverable = ({ children }: { children: React.ReactNode }) => (
  <div className="deliver"><b>الـ deliverable</b>{children}</div>
);
const ReviewQuestion = ({ children }: { children: React.ReactNode }) => (
  <div className="question"><b>سؤال المراجعة</b>{children}</div>
);

const Journey = ({ children }: { children: React.ReactNode }) => <ol className="journey">{children}</ol>;
const Step = ({ file, children }: { file: string; children: React.ReactNode }) => (
  <li><span className="file">{file}</span>{children}</li>
);
const Scenario = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="scenario"><h3>{title}</h3>{children}</div>
);

const BeforeAfter = ({ children }: { children: React.ReactNode }) => <div className="ba">{children}</div>;
const Side = ({ label, kind, children }: { label: string; kind: "before" | "after"; children: React.ReactNode }) => (
  <div className={`side ${kind}`}><b>{label}</b>{children}</div>
);

const CheatGrid = ({ children }: { children: React.ReactNode }) => <div className="cheat">{children}</div>;
const CheatCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="cheat-card"><h4>{title}</h4>{children}</div>
);

const TAG: Record<string, string> = { yt: "يوتيوب مجاني", paid: "مدفوع", read: "مقال / docs", free: "مجاني", book: "كتاب", repo: "GitHub", tool: "أداة", community: "مجتمع" };
const Courses = ({ children }: { children: React.ReactNode }) => <div className="courses">{children}</div>;
const CourseTopic = ({ title, week, children }: { title: string; week: string; children: React.ReactNode }) => (
  <article className="course-topic"><h3>{title}</h3><small className="wk">{week}</small><div className="course-cols">{children}</div></article>
);
const CourseCol = ({ lang, children }: { lang: "ar" | "en"; children: React.ReactNode }) => (
  <div className="course-col"><h4>{lang === "ar" ? "عربي" : "إنجليزي"}</h4>{children}</div>
);
const CourseNote = ({ children }: { children: React.ReactNode }) => (
  <div className="course-note" style={{ gridColumn: "1 / -1" }}>{children}</div>
);
const ResGroup = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
  <article className="course-topic"><h3>{title}</h3>{sub && <small className="wk">{sub}</small>}<div className="res-list">{children}</div></article>
);
const Res = ({ title, href, tag, star, children }: { title: string; href: string; tag: "yt" | "paid" | "read" | "free" | "book" | "repo" | "tool" | "community"; star?: string; children?: React.ReactNode }) => (
  <div className="res">
    {star === "true" && <span className="star" title="ابدأ بده">★ </span>}
    <a href={href} target="_blank" rel="noreferrer">{title}</a> <span className={`tag ${tag}`}>{TAG[tag]}</span>
    {children && <small>{children}</small>}
  </div>
);
const None = ({ children }: { children: React.ReactNode }) => <div className="none">{children}</div>;

export const mdxComponents: MDXComponents = {
  pre: Pre,
  table: (props) => <div className="table-wrap"><table {...props} /></div>,
  a: ({ href = "", ...props }) =>
    href.startsWith("http") ? <a href={href} target="_blank" rel="noreferrer" {...props} /> : <a href={href} {...props} />,
  Level, LevelLegend, LessonPart, Lab, LogBox, Analogy, Note, CodeBlock, Diagram,
  Quiz, Question, Ask, Answer,
  Tasks, Task, Deliverable, ReviewQuestion,
  Journey, Step, Scenario, BeforeAfter, Side,
  CheatGrid, CheatCard,
  Courses, CourseTopic, CourseCol, CourseNote, ResGroup, Res, None,
};
