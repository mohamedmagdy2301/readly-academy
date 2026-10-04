"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { NAV } from "@/lib/nav";
import { KEYS, write } from "@/lib/storage";
import Search from "./Search";
import ThemeToggle from "./ThemeToggle";

export default function TopBar() {
  const pathname = usePathname() || "/";

  // remember the last visited page for the "continue" button on the home page
  useEffect(() => {
    if (pathname !== "/") write(KEYS.last, pathname);
  }, [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link className="brand" href="/"><i>CA</i><span>رحلة Clean Architecture</span></Link>
        <nav className="tabs" aria-label="أقسام الموقع">
          {NAV.map((item) => (
            <Link key={item.href} className="tab" href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="tools">
          <Search />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
