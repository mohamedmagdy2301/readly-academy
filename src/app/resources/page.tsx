import type { Metadata } from "next";
import Tabs from "@/components/Tabs";
import { renderMdx } from "@/components/render";
import { getPages } from "@/lib/pages";

export const metadata: Metadata = { title: "المصادر" };

export default async function ResourcesPage() {
  const pages = getPages("resources");
  const rendered = await Promise.all(pages.map(async (p) => ({ ...p, content: await renderMdx(p.body) })));
  return (
    <div className="content narrow">
      <header className="section-head">
        <h1>المصادر</h1>
        <p className="lede">الـ docs والـ packages، وكورسات وفيديوهات، ومقالات وكتب، ومشاريع تقراها، وأدوات ومجتمعات.</p>
      </header>
      <Tabs tabs={rendered.map((p) => ({ id: p.slug, label: p.title, content: <div className="doc">{p.description && <p className="lede">{p.description}</p>}{p.content}</div> }))} />
    </div>
  );
}
