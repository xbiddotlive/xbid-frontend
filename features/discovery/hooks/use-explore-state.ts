"use client";
import { useCallback, useMemo, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";

const fallback = new Map<string, string>();
const subscribe = (notify: () => void) => {
  window.addEventListener("explore-preference", notify);
  return () => window.removeEventListener("explore-preference", notify);
};

// Tab-local UI preferences only; never persist wallet data or API snapshots.
export function useExploreState<T>(key: string, initial: T, valid: (value: unknown) => value is T): [T, Dispatch<SetStateAction<T>>] {
  const initialJson = JSON.stringify(initial);
  const read = useCallback(() => {
    try { return sessionStorage.getItem(key) ?? fallback.get(key) ?? initialJson; }
    catch { return fallback.get(key) ?? initialJson; }
  }, [key, initialJson]);
  const raw = useSyncExternalStore(subscribe, read, () => initialJson);
  const value = useMemo(() => {
    try { const parsed: unknown = JSON.parse(raw); return valid(parsed) ? parsed : initial; }
    catch { return initial; }
  }, [raw, valid, initial]);
  const setValue: Dispatch<SetStateAction<T>> = useCallback(next => {
    const result = typeof next === "function" ? (next as (value: T) => T)(value) : next;
    if (!valid(result)) return;
    const encoded = JSON.stringify(result);
    fallback.set(key, encoded);
    if (fallback.size > 250) fallback.delete(fallback.keys().next().value!);
    try { sessionStorage.setItem(key, encoded); } catch { /* Optional persistence. */ }
    window.dispatchEvent(new Event("explore-preference"));
  }, [key, value, valid]);
  return [value, setValue];
}

export const validPage = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1000;
