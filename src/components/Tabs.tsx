"use client";
import { useEffect, useState } from "react";

type Tab = { id: string; label: string; content: React.ReactNode };

/** Tabs that also follow the URL hash: a link to an element inside a hidden tab opens that tab. */
export default function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    function sync() {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      if (tabs.some((t) => t.id === id)) { setActive(id); return; }
      const el = document.getElementById(id);
      const panel = el?.closest<HTMLElement>("[data-tab]");
      if (panel?.dataset.tab) {
        setActive(panel.dataset.tab);
        if (el instanceof HTMLDetailsElement) el.open = true;
        requestAnimationFrame(() => el?.scrollIntoView());
      }
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [tabs]);

  return (
    <div className="tabs-box">
      <div className="tab-list" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={active === t.id} className={`tab-btn${active === t.id ? " active" : ""}`}
            onClick={() => { setActive(t.id); history.replaceState(null, "", `#${t.id}`); }}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" data-tab={t.id} hidden={active !== t.id}>{t.content}</div>
      ))}
    </div>
  );
}
