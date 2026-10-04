"use client";
import { useCallback, useSyncExternalStore } from "react";

export { KEYS } from "./keys";

const EVENT = "cag-storage";
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  if (cache.has(key)) return cache.get(key) as T;
  let value = fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw != null) value = JSON.parse(raw) as T;
  } catch {
    /* storage unavailable or corrupted: use fallback */
  }
  cache.set(key, value);
  return value;
}

export function write<T>(key: string, value: T) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode errors */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

function subscribe(callback: () => void) {
  const onCustom = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key) cache.delete(e.key);
    callback();
  };
  window.addEventListener(EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/** A tiny shared store on top of localStorage. All components using the same key stay in sync. */
export function useStored<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback((next: T | ((prev: T) => T)) => {
    const prev = read(key, fallback);
    write(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
  }, [key, fallback]);
  return [value, set] as const;
}

/** Record<string, V> helper: read or update a single entry. */
export function useStoredEntry<V>(key: string, id: string) {
  const [map, setMap] = useStored<Record<string, V>>(key, EMPTY as Record<string, V>);
  const value = map[id];
  const set = useCallback((v: V | undefined) => {
    setMap((prev) => {
      const next = { ...prev };
      if (v === undefined) delete next[id];
      else next[id] = v;
      return next;
    });
  }, [id, setMap]);
  return [value, set] as const;
}

const EMPTY: Record<string, never> = Object.freeze({}) as Record<string, never>;
export const EMPTY_MAP = EMPTY;
