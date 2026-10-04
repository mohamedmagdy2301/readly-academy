import Link from "next/link";
export default function NotFound() {
  return (
    <div className="content not-found">
      <h1>الصفحة دي مش موجودة</h1>
      <p><Link href="/">ارجع للرئيسية</Link></p>
    </div>
  );
}
