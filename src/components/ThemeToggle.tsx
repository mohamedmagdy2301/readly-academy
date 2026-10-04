"use client";
import { KEYS } from "@/lib/keys";

export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(KEYS.theme, JSON.stringify(next)); } catch { /* ignore */ }
  }
  return (
    <button className="icon-btn" type="button" onClick={toggle} aria-label="تبديل الوضع الليلي">◐</button>
  );
}
