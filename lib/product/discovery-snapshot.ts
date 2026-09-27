import type { IndexedContest, ContestPage } from "@/lib/api/contests";

export async function refreshContestPages(load: (cursor?: string) => Promise<ContestPage>, count: number) {
  let latest = await load();
  const seen = new Set<string>();
  for (let page = 1; page < count && latest.nextCursor; page += 1) {
    if (seen.has(latest.nextCursor)) throw new Error("repeated contest cursor");
    seen.add(latest.nextCursor);
    const next = await load(latest.nextCursor);
    latest = { items: [...latest.items, ...next.items], nextCursor: next.nextCursor };
  }
  return { ...latest, items: [...new Map(latest.items.map(item => [item.contestId, item])).values()] };
}

// Retain unchanged identities so polling does not invalidate every row's memo.
export function reconcileContests(previous: IndexedContest[], incoming: IndexedContest[]) {
  const byId = new Map(previous.map((contest) => [`${contest.chainId}:${contest.contestId}`, contest]));
  const result = incoming.map((contest) => {
    const before = byId.get(`${contest.chainId}:${contest.contestId}`);
    if (!before) return contest;
    if (JSON.stringify(before) === JSON.stringify(contest)) return before;
    return {
      ...contest,
      metadata: JSON.stringify(before.metadata) === JSON.stringify(contest.metadata) ? before.metadata : contest.metadata,
    };
  });
  return result.length === previous.length && result.every((contest, index) => contest === previous[index]) ? previous : result;
}

export function paginate<T>(items: readonly T[], requestedPage: number, size: number) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError("invalid page size");
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(0, Math.trunc(requestedPage) || 0), pages - 1);
  return { page, pages, items: items.slice(page * size, (page + 1) * size) };
}
