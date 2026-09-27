"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getContestPage, getContestSummary, type ContestPage, type ContestSummary, type ContestScope } from "@/lib/api/contests";
import { reconcileContests, refreshContestPages } from "@/lib/product/discovery-snapshot";

// Callers key the owner by query/scope, so old requests cannot populate a new filter.
export function useDiscoveryFeed(chainId: number, query: string, initial: ContestPage, initialSummary: ContestSummary | null, initialAvailable: boolean, scope: ContestScope = {}, enabled = true) {
  const region = scope.region ?? "";
  const category = scope.category ?? "";
  const [feed, setFeed] = useState({ ...initial, summary: initialSummary, available: initialAvailable, summaryAvailable: initialSummary !== null, updatedAt: 0 });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const busy = useRef(false);
  const pages = useRef(1);
  const alive = useRef(true);
  const storageKey = `explore:${JSON.stringify([chainId, query, region, category])}:loaded-pages`;
  const refresh = useCallback(async () => {
    if (!enabled || document.hidden || busy.current) return;
    busy.current = true;
    try {
      const summaryRequest = region || category ? Promise.resolve(null) : getContestSummary(chainId).catch(() => null);
      const latest = await refreshContestPages(cursor => getContestPage(chainId, cursor, query, { region, category }), pages.current);
      const summary = await summaryRequest;
      if (alive.current) setFeed(previous => ({ ...latest, items: reconcileContests(previous.items, latest.items), summary: summary ?? previous.summary, available: true, summaryAvailable: summary !== null, updatedAt: Date.now() }));
    } catch {
      if (alive.current) setFeed(previous => ({ ...previous, available: false }));
    } finally { busy.current = false; }
  }, [chainId, query, region, category, enabled]);
  useEffect(() => {
    if (!enabled) return;
    alive.current = true;
    try {
      const saved = Number(sessionStorage.getItem(storageKey));
      if (Number.isInteger(saved) && saved >= 1 && saved <= 50) pages.current = saved;
    } catch { /* Optional UI restoration. */ }
    const first = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { alive.current = false; window.clearTimeout(first); window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [refresh, storageKey, enabled]);
  const loadMore = async () => {
    if (!enabled || !feed.nextCursor || busy.current) return;
    busy.current = true;
    setLoading(true); setLoadError(false);
    try {
      const next = await getContestPage(chainId, feed.nextCursor, query, { region, category });
      if (next.nextCursor === feed.nextCursor) throw new Error("repeated contest cursor");
      if (alive.current) {
        pages.current += 1;
        try { sessionStorage.setItem(storageKey, String(Math.min(pages.current, 50))); } catch { /* Optional. */ }
        setFeed(previous => ({ ...previous, nextCursor: next.nextCursor, items: [...new Map([...previous.items, ...next.items].map(item => [item.contestId, item])).values()] }));
      }
    } catch { if (alive.current) setLoadError(true); }
    finally { busy.current = false; if (alive.current) setLoading(false); }
  };
  return { ...feed, loading, loadError, loadMore, refresh };
}
