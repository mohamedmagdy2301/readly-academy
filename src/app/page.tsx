import Link from "next/link";
import HomeDashboard from "@/components/Home";
import { getManifest } from "@/lib/course";

export default function HomePage() {
  return (
    <div className="content home">
      <section className="home-hero">
        <p className="kicker">Flutter Clean Path</p>
        <h1>من الأساس للاحتراف، خطوة بخطوة</h1>
        <p className="lede">11 وحدة بترتيب المذاكرة. كل درس فيه الشرح والكود والمعمل والأسئلة في مكان واحد، وآخر كل وحدة مهام تطبّقها في مشروع حقيقي. التقدم بيتحفظ على المتصفح ده.</p>
      </section>
      <HomeDashboard manifest={getManifest()} />
      <section className="home-links">
        <Link className="card" href="/review/"><b>المراجعة</b><span>كروت مراجعة، وأسئلة interviews، والملخص، والمسرد، وإجاباتك.</span></Link>
        <Link className="card" href="/resources/"><b>المصادر</b><span>Docs رسمية، وكورسات وفيديوهات عربي وإنجليزي لكل موضوع.</span></Link>
      </section>
    </div>
  );
}
