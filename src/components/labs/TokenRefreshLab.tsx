"use client";
import { useState } from "react";
import { Log, sleep, useLog } from "./useLog";
import Switch from "./Switch";

const REQUESTS = ["GET /library", "GET /notes", "POST /library"];
type Chip = { cls: string; label: string };

export default function TokenRefreshLab() {
  const [lock, setLock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [chips, setChips] = useState<Chip[] | null>(null);
  const [count, setCount] = useState(0);
  const [result, setResult] = useState("—");
  const { lines, add, reset } = useLog();

  const setChip = (i: number, cls: string, label: string) =>
    setChips((prev) => (prev ?? []).map((c, j) => (j === i ? { cls, label } : c)));

  async function run() {
    setBusy(true); reset(); setCount(0); setResult("شغّال...");
    setChips(REQUESTS.map(() => ({ cls: "", label: "sent" })));
    let refreshes = 0;
    let rotated = false; // refresh token rotation: each refresh token works once

    REQUESTS.forEach((r, i) => add("req", <>طلب {i + 1} اتبعت: <code>{r}</code></>));
    await sleep(500);
    REQUESTS.forEach((_, i) => { setChip(i, "failed", "401"); add("bad", <>طلب {i + 1} رجع 401: الـ token منتهي</>); });
    await sleep(400);

    async function refresh(who: number) {
      refreshes++; setCount(refreshes);
      add("req", <>refresh #{refreshes} بدأ من طلب {who}</>);
      await sleep(500 + who * 60);
      if (rotated) { add("bad", <>refresh من طلب {who} فشل: الـ refresh token اتستخدم قبل كده</>); return false; }
      rotated = true; add("ok", <>refresh من طلب {who} نجح: token جديد</>); return true;
    }

    if (lock) {
      const shared = refresh(1);
      add("cancel", "طلب 2 وطلب 3 لقوا refresh شغال، فاستنوا نفس الـ future");
      setChip(0, "syncing", "refreshing"); setChip(1, "syncing", "waiting"); setChip(2, "syncing", "waiting");
      await shared;
      REQUESTS.forEach((_, i) => { setChip(i, "syncing", "retry"); add("req", <>طلب {i + 1} اتعاد بالـ token الجديد</>); });
      await sleep(500);
      REQUESTS.forEach((_, i) => setChip(i, "synced", i === 2 ? "201" : "200"));
      add("ok", "التلات طلبات نجحوا");
      setResult("refresh واحد، والتلات طلبات نجحوا");
    } else {
      REQUESTS.forEach((_, i) => setChip(i, "syncing", "refreshing"));
      const results = await Promise.all([refresh(1), refresh(2), refresh(3)]);
      results.forEach((ok, i) => setChip(i, ok ? "synced" : "failed", ok ? "200" : "logout"));
      if (results.includes(false)) {
        add("bad", "الـ refresh الفاشل مسح الـ session، والمستخدم اتحول لصفحة الدخول!");
        setResult("3 مرات refresh، والمستخدم اتطرد من غير ذنب");
      }
    }
    setBusy(false);
  }

  return (
    <section className="lab">
      <h2>3 طلبات والـ token منتهي</h2>
      <p>السيرفر هنا بيستخدم refresh token rotation، يعني كل refresh token بيشتغل مرة واحدة بس، وده الطبيعي في الـ APIs الحقيقية. اقفل الـ lock وشغّل، وبعدين افتحه وشغّل تاني.</p>
      <div className="lab-controls">
        <Switch checked={lock} onChange={setLock}>lock بـ Completer</Switch>
        <button className="btn" type="button" onClick={run} disabled={busy}>ابعت 3 طلبات</button>
      </div>
      {chips && (
        <div className="lanes">
          {REQUESTS.map((r, i) => (
            <div className="lane" key={r}><code>{r}</code><span className={`chip ${chips[i]?.cls ?? ""}`}>{chips[i]?.label}</span></div>
          ))}
        </div>
      )}
      <div className="lab-stats">
        <div><b>{count}</b><small>مرات refresh</small></div>
        <div className="wide"><b>{result}</b><small>النتيجة</small></div>
      </div>
      <Log lines={lines} />
    </section>
  );
}
