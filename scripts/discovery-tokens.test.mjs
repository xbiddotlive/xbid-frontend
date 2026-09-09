import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { formatUnits } from "viem";

function load(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const context = { exports: {}, require: (id) => {
    if (!(id in dependencies)) throw new Error(`unexpected dependency ${id}`);
    return dependencies[id];
  } };
  vm.runInNewContext(output.outputText, context);
  return context.exports;
}
const metrics = load("../lib/product/market-metrics.ts", { viem: { formatUnits } });
const { discoveryTokens, pairedTokens, selectTokens, priceMove } = load("../lib/product/discovery-tokens.ts", { "./market-metrics": metrics });
const { reconcileContests, paginate, refreshContestPages } = load("../lib/product/discovery-snapshot.ts", {});
const config = load("../next.config.ts", {}).default;

test("shared price display distinguishes missing data from a real zero change", () => {
  assert.equal(metrics.formatPriceChange(null), "—");
  assert.equal(metrics.formatPriceChange(NaN), "—");
  assert.equal(metrics.formatPriceChange(0), "0.00%");
  assert.equal(metrics.formatPriceChange(-0.001), "0.00%");
  assert.equal(metrics.formatPriceChange(-1.23), "-1.23%");
  assert.equal(metrics.formatPriceChange(1.23), "+1.23%");
});

test("loaded page refresh follows cursors, deduplicates movement, and fails closed", async () => {
  const a = { contestId: "a" }, b = { contestId: "b" };
  const calls = [];
  const result = await refreshContestPages(async cursor => { calls.push(cursor); return cursor ? { items: [a, b], nextCursor: null } : { items: [a], nextCursor: "next" }; }, 4);
  assert.deepEqual(calls, [undefined, "next"]);
  assert.equal(result.items.length, 2);
  assert.equal(result.nextCursor, null);
  await assert.rejects(refreshContestPages(async () => ({ items: [a], nextCursor: "loop" }), 4), /repeated contest cursor/);
  await assert.rejects(refreshContestPages(async cursor => { if (cursor) throw Error("offline"); return { items: [a], nextCursor: "next" }; }, 2), /offline/);
});
const contest = (id = "1", volume = "100") => ({
  contestId: id, chainId: "46630", marketVersion: 3, createdAt: "100000",
  metadata: { sideA: { name: "alpha", symbol: "SAME" }, sideB: { name: "beta", symbol: "SAME" } },
  market: { qAWei: "76219751648514662550000", qBWei: "0", qA24hAgoWei: "0", qB24hAgoWei: "0", volume24hUnits: volume, sideAVolume24hUnits: volume, sideBVolume24hUnits: "0", sideATradeCount24h: "3", sideBTradeCount24h: "0" },
});
test("both sides retain unique keys and direct side-specific trade links", () => {
  const rows = discoveryTokens([contest(), contest("2")]);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map((row) => row.key)).size, 4);
  assert.equal(rows[0].href, "/contest/1?trade=buy&side=a");
  assert.equal(rows.find((row) => row.key === "46630:1:1").href, "/contest/1?trade=buy&side=b");
  assert.equal(rows[0].metadata.symbol, "SAME");
  assert.equal(rows[1].metadata.symbol, "SAME");
});
test("all tokens keep A and B paired despite activity ranking, duplicate tickers and page overlap", () => {
  const first = contest("1", "10"), second = contest("2", "99999");
  second.market.sideBVolume24hUnits = "100000";
  const pairs = pairedTokens([first, second, first, { ...contest("3"), market: null }]);
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].key, "46630:1");
  for (const pair of pairs) {
    assert.equal(pair.a.key, pair.key + ":0");
    assert.equal(pair.b.key, pair.key + ":1");
    assert.equal(pair.a.side, "a");
    assert.equal(pair.b.side, "b");
  }
  const searchResult = pairedTokens([second]);
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].b.href, "/contest/2?trade=buy&side=b");
  assert.equal(pairedTokens([first, { ...first, chainId: "84532" }]).length, 2);
});
test("prices and changes exactly match shared detail-page calculations", () => {
  const item = contest();
  const expected = metrics.contestMetrics(item);
  discoveryTokens([item]).forEach((row) => {
    const index = row.side === "a" ? 0 : 1;
    assert.equal(row.price, expected.current[index]);
    assert.equal(row.change, expected.changes[index]);
  });
  assert.ok(expected.changes[0] > 0);
  assert.ok(expected.changes[1] < 0);
});
test("missing anchors remain unavailable rather than fabricated flat changes", () => {
  const item = contest();
  item.market.qB24hAgoWei = null;
  assert.ok(discoveryTokens([item]).every((row) => row.change === null));
  assert.equal(discoveryTokens([{ ...item, market: null }]).length, 0);
  assert.equal(discoveryTokens([]).length, 0);
});
test("activity sorting is stable, precise for large integers and does not mutate input", () => {
  const input = [contest("2", "9007199254740992"), contest("1", "9007199254740993")];
  assert.equal(discoveryTokens(input)[0].key, "46630:1:0");
  assert.equal(input[0].contestId, "2");
  assert.equal(discoveryTokens([contest("2"), contest("1")])[0].key, "46630:1:0");
});

test("unchanged snapshots retain the array and row identities", () => {
  const before = [contest("1"), contest("2")];
  assert.equal(reconcileContests(before, structuredClone(before)), before);
  const after = structuredClone(before);
  after[1].market.qBWei = "1000000000000000000";
  const merged = reconcileContests(before, after);
  assert.equal(merged[0], before[0]);
  assert.notEqual(merged[1], before[1]);
  assert.equal(merged[1].metadata, before[1].metadata);
  assert.equal(merged[1].market.qBWei, after[1].market.qBWei);
});

test("reconciliation handles metadata edits, removal, ordering and chain identities", () => {
  const before = [contest("1"), contest("2")];
  const changed = structuredClone(before[1]);
  changed.metadata.sideA.name = "new name";
  const merged = reconcileContests(before, [changed, before[0]]);
  assert.equal(merged[0].metadata.sideA.name, "new name");
  assert.equal(merged[1], before[0]);
  assert.equal(reconcileContests(before, [before[1]]).length, 1);
  const crossChain = { ...before[0], chainId: "84532" };
  assert.equal(reconcileContests(before, [crossChain])[0], crossChain);
});

test("token pagination caps rows at 18 without repeating assets or forcing A/B pairs", () => {
  const tokens = discoveryTokens(Array.from({ length: 16 }, (_, i) => contest(String(i))));
  const pages = [0, 1].map((page) => paginate(tokens, page, 18));
  assert.equal(pages[0].items.length, 18);
  assert.equal(pages[1].items.length, 14);
  assert.equal(new Set(pages.flatMap((page) => page.items.map((token) => token.key))).size, 32);
  assert.ok(pages[0].items.slice(0, 16).every((row) => row.side === "a"));
  assert.equal(paginate(tokens, 99, 18).page, 1);
  assert.equal(paginate([], 2, 12).items.length, 0);
  assert.equal(paginate(tokens, -1, 12).page, 0);
  assert.throws(() => paginate(tokens, 0, 0), /invalid page size/);
});

test("each side uses only its own 24h volume and hot eligibility", () => {
  const item = contest();
  item.market.volume24hUnits = "9000000";
  item.market.sideAVolume24hUnits = "7000000";
  item.market.sideBVolume24hUnits = "2000000";
  item.market.sideBTradeCount24h = "2";
  const tokens = discoveryTokens([item]);
  assert.equal(tokens[0].volume24hUnits, "7000000");
  assert.equal(tokens[1].volume24hUnits, "2000000");
  assert.equal(selectTokens(tokens, "hot", 0).length, 1);
  assert.equal(selectTokens(tokens, "hot", 0)[0].side, "a");
  item.market.sideBVolume24hUnits = "8000000";
  assert.equal(discoveryTokens([item])[0].side, "b");
  item.market.sideAVolume24hUnits = "0";
  assert.equal(selectTokens(discoveryTokens([item]), "hot", 0).length, 0);
});

test("new expires at 24h, rejects future dates and ranks newest first", () => {
  const current = contest("new");
  const old = { ...contest("old"), createdAt: "13600" };
  const future = { ...contest("future"), createdAt: "100001" };
  const almostOld = { ...contest("recent"), createdAt: "13601" };
  const tokens = discoveryTokens([old, almostOld, current, future]);
  const recent = selectTokens(tokens, "new", 100000);
  assert.equal(recent.length, 4);
  assert.equal(recent[0].createdAt, 100000);
  assert.equal(selectTokens(discoveryTokens([current]), "new", 186400).length, 0);
});

test("gainers exclude missing, flat, rounded-zero and negative changes", () => {
  const base = discoveryTokens([contest()])[0];
  const tokens = [null, 0, -10, 0.004, 12, 22].map((change, i) => ({ ...base, key: String(i), change }));
  const selected = selectTokens(tokens, "gainers", 0);
  assert.equal(selected.length, 2);
  assert.equal(selected[0].change, 22);
  assert.equal(selected[1].change, 12);
  assert.equal(tokens[0].change, null);
  assert.equal(selectTokens([], "gainers", 0).length, 0);
});

test("duplicate input never pads the list, but identical tickers remain distinct", () => {
  assert.equal(discoveryTokens([contest(), contest()]).length, 2);
  assert.equal(discoveryTokens([contest(), contest("2")]).length, 4);
});

test("price hints follow displayed price changes, not unchanged polls or 24h changes", () => {
  assert.equal(priceMove(0.01, 0.01), null);
  assert.equal(priceMove(0.01, 0.010001), null);
  assert.equal(priceMove(0.01, 0.0101), "positive");
  assert.equal(priceMove(0.0101, 0.01), "negative");
  assert.equal(priceMove(NaN, 0.01), null);
});

test("thumbnail allowlist preserves the network icon without opening arbitrary URLs", () => {
  assert.ok(config.images.localPatterns.some((pattern) => pattern.pathname === "/icons/robinhood-chain-avatar.jpg" && pattern.search === ""));
  assert.ok(config.images.localPatterns.some((pattern) => pattern.pathname === "/api/backend/v1/assets/*" && pattern.search === ""));
  assert.equal(config.images.localPatterns.length, 2);
  assert.equal(config.images.remotePatterns.length, 0);
  assert.equal(config.images.maximumRedirects, 0);
});
