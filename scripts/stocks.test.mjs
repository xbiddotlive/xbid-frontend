import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function load(path, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const context = { exports: {}, require: id => { if (!(id in dependencies)) throw Error(`unexpected import ${id}`); return dependencies[id]; }, ...globals };
  vm.runInNewContext(output.outputText, context);
  return context.exports;
}
const catalog = load("../lib/product/stock-catalog.ts");
const scope = load("../lib/product/contest-scope.ts");
const schemas = load("../lib/api/schemas.ts", { zod: { z }, "@/lib/product/contest-scope": scope });
test("stock catalog is unique, searchable and matches backend", () => {
  assert.equal(new Set(catalog.stockCatalog.map(item => item.id)).size, catalog.stockCatalog.length);
  for (const query of ["TSLA", "tesla", "特斯拉", "nasdaq tsla"]) assert.equal(catalog.searchStocks(query)[0].symbol, "TSLA");
  assert.equal(catalog.searchStocks("not-listed").length, 0);
  assert.equal(catalog.validStockSelection(["xnas-tsla", "xnas-amd"]), true);
  for (const input of [undefined, [], ["unknown"], ["xnas-tsla", "xnas-tsla"], catalog.stockCatalog.slice(0, 3).map(s => s.id)]) assert.equal(catalog.validStockSelection(input), false);
  const backend = new URL("../../backend-nestjs/src/modules/metadata/application/stock-catalog.ts", import.meta.url);
  if (existsSync(backend)) assert.equal(readFileSync(backend, "utf8"), readFileSync(new URL("../lib/product/stock-catalog.ts", import.meta.url), "utf8"));
});
const stock = catalog.selectedStocks(["xnas-tsla"])[0];
test("labels and disclosure render only for stock contests; no raw HTML is rendered", () => {
  const { StockLabels, StockNotice } = load("../components/contest/stock-labels.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "@/lib/i18n/locale-context": { useI18n: () => ({ t: key => key === "stocks.disclaimer" ? "Opinion tokens, not stocks" : "Associated stocks" }) },
  });
  assert.match(renderToStaticMarkup(StockLabels({ category: "stocks", stocks: [stock] })), /NASDAQ:TSLA/);
  assert.equal(renderToStaticMarkup(StockLabels({ category: "crypto", stocks: [stock] })), "");
  assert.equal(renderToStaticMarkup(StockLabels({ category: "stocks" })), "");
  assert.match(renderToStaticMarkup(StockNotice({ category: "stocks" })), /Opinion tokens/);
  assert.equal(renderToStaticMarkup(StockNotice({ category: "crypto" })), "");
  assert.doesNotMatch(renderToStaticMarkup(StockLabels({ category: "stocks", stocks: [{ ...stock, symbol: "<script>" }] })), /<script>/);
});
test("metadata request carries listing IDs and rejects old servers dropping or changing them", async () => {
  let sent;
  const address = "0x" + "ab".repeat(20), hash = "0x" + "ab".repeat(32);
  const metadata = { version: 1, category: "stocks", title: "Stock views", description: "Two views", creator: address, referenceUrl: null, createdAt: "2026-09-09T00:00:00Z", sideA: { name: "A", symbol: "A", logoUrl: null }, sideB: { name: "B", symbol: "B", logoUrl: null } };
  const api = load("../lib/api/metadata.ts", { "./schemas": schemas, "./http": { apiEndpoint: path => path, apiJson: r => r } }, {
    fetch: async (url, init) => { sent = JSON.parse(init.body); return { metadataHash: hash, metadataUri: "https://example.com/metadata", metadata }; },
  });
  const input = { category: "stocks", stockIds: ["xnas-tsla"] };
  await assert.rejects(api.prepareContestMetadata(input, "test"), /associated stocks/);
  metadata.stocks = catalog.selectedStocks(["xnas-amd"]);
  await assert.rejects(api.prepareContestMetadata(input, "test"), /associated stocks/);
  metadata.stocks = [stock];
  assert.equal((await api.prepareContestMetadata(input, "test")).metadata.stocks[0].symbol, "TSLA");
  assert.deepEqual(sent.stockIds, input.stockIds);
});
