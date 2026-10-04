import Link from "next/link";

type L = { href: string; title: string } | null;

export default function PrevNext({ prev, next }: { prev: L; next: L }) {
  if (!prev && !next) return null;
  return (
    <nav className="prev-next" aria-label="التنقل بين الصفحات">
      {prev ? <Link href={prev.href}><small>اللي قبله</small>{prev.title}</Link> : <span />}
      {next ? <Link className="next" href={next.href}><small>اللي بعده</small>{next.title}</Link> : <span />}
    </nav>
  );
}
