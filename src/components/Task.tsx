"use client";
import { KEYS, useStoredEntry } from "@/lib/storage";

export default function Task({ id, children }: { id: string; children: React.ReactNode }) {
  const [checked, setChecked] = useStoredEntry<boolean>(KEYS.tasks, id);
  return (
    <li id={`task-${id}`}>
      <label>
        <input type="checkbox" checked={!!checked} onChange={(e) => setChecked(e.target.checked || undefined)} />
        <span>{children}</span>
      </label>
    </li>
  );
}
