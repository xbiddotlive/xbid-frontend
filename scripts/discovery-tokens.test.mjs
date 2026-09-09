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
const { discoveryTokens } = load("../lib/product/discovery-tokens.ts", { "./market-metrics": metrics });
const { reconcileContests, paginate } = load("../lib/product/discovery-snapshot.ts", {});
const config = load("../next.config.ts", {}).default;
const contest = (id = "1", volume = "100") => ({
  contestId: id, chainId: "46630", marketVersion: 3,
  metadata: { sideA: { name: "alpha", symbol: "SAME" }, sideB: { name: "beta", symbol: "SAME" } },
  market: { qAWei: "76219751648514662550000", qBWei: "0", qA24hAgoWei: "0", qB24hAgoWei: "0", volume24hUnits: volume },
});
test("both sides retain unique keys and direct side-specific trade links", () => {
  const rows = discoveryTokens([contest(), contest("2")]);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map((row) => row.key)).size, 4);
  assert.equal(rows[0].href, "/contest/1?trade=buy&side=a");
  assert.equal(rows[1].href, "/contest/1?trade=buy&side=b");
  assert.equal(rows[0].metadata.symbol, "SAME");
  assert.equal(rows[1].metadata.symbol, "SAME");
});
test("prices and changes exactly match shared detail-page calculations", () => {
  const item = contest();
  const expected = metrics.contestMetrics(item);
  discoveryTokens([item]).forEach((row, index) => {
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

test("token pagination caps DOM rows and never separates an A/B pair", () => {
  const tokens = discoveryTokens(Array.from({ length: 16 }, (_, i) => contest(String(i))));
  const pages = [0, 1, 2].map((page) => paginate(tokens, page, 12));
  assert.equal(pages[0].items.length, 12);
  assert.equal(pages[2].items.length, 8);
  assert.equal(new Set(pages.flatMap((page) => page.items.map((token) => token.key))).size, 32);
  for (const page of pages) for (let i = 0; i < page.items.length; i += 2) {
    assert.equal(page.items[i].side, "a");
    assert.equal(page.items[i + 1].side, "b");
    assert.equal(page.items[i].key.slice(0, -1), page.items[i + 1].key.slice(0, -1));
  }
  assert.equal(paginate(tokens, 99, 12).page, 2);
  assert.equal(paginate([], 2, 12).items.length, 0);
  assert.equal(paginate(tokens, -1, 12).page, 0);
  assert.throws(() => paginate(tokens, 0, 0), /invalid page size/);
});

test("thumbnail allowlist preserves the network icon without opening arbitrary URLs", () => {
  assert.ok(config.images.localPatterns.some((pattern) => pattern.pathname === "/icons/robinhood-chain-avatar.jpg" && pattern.search === ""));
  assert.ok(config.images.localPatterns.some((pattern) => pattern.pathname === "/api/backend/v1/assets/*" && pattern.search === ""));
  assert.equal(config.images.localPatterns.length, 2);
  assert.equal(config.images.remotePatterns.length, 0);
  assert.equal(config.images.maximumRedirects, 0);
});
