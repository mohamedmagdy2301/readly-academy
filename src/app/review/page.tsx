import type { Metadata } from "next";
import Tabs from "@/components/Tabs";
import Flashcards from "@/components/Flashcards";
import MyAnswers from "@/components/MyAnswers";
import { renderMdx } from "@/components/render";
import { getPages } from "@/lib/pages";
import { getCourse } from "@/lib/course";

export const metadata: Metadata = { title: "المراجعة" };

export default async function ReviewPage() {
  const pages = getPages("review");
  const rendered = await Promise.all(pages.map(async (p) => ({ ...p, content: await renderMdx(p.body) })));
  const answers = getCourse().flatMap((u) => u.lessons.filter((l) => l.log).map((l) => ({
    id: l.log!.id, unit: `الوحدة ${u.num}: ${u.title}`, question: l.log!.question, href: l.href,
  })));
  return (
    <div className="content narrow">
      <header className="section-head">
        <h1>المراجعة</h1>
        <p className="lede">كروت مراجعة من كل أسئلة الكورس، وأسئلة الـ interviews، والملخص، والمسرد، وكل إجاباتك على أسئلة المراجعة في مكان واحد.</p>
      </header>
      <Tabs tabs={[
        { id: "cards", label: "كروت المراجعة", content: <Flashcards /> },
        ...rendered.map((p) => ({ id: p.slug, label: p.title, content: <div className="doc">{p.description && <p className="lede">{p.description}</p>}{p.content}</div> })),
        { id: "answers", label: "إجاباتي", content: <MyAnswers entries={answers} /> },
      ]} />
    </div>
  );
}
