import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";

function load(path, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const context = { exports: {}, require: id => { if (!(id in dependencies)) throw Error(`unexpected import ${id}`); return dependencies[id]; }, ...globals };
  vm.runInNewContext(output.outputText, context);
  return context.exports;
}
const scope = load("../lib/product/contest-scope.ts");
const schemas = load("../lib/api/schemas.ts", { zod: { z }, "@/lib/product/contest-scope": scope });
const metadata = { title: "Local scope test", description: "A test", category: "culture", sideA: { name: "A", symbol: "A" }, sideB: { name: "B", symbol: "B" } };
const address = "0x" + "ab".repeat(20), hash = "0x" + "ab".repeat(32);
const item = { chainId: "46630", contestId: hash, metadataHash: hash, marketVault: address, creator: address, sideAToken: address, sideBToken: address, marketVersion: 3, createdBlock: "1", createdAt: "1", metadata, market: null };

test("scope catalogs are explicit, unique and consistent across frontend/backend", () => {
  assert.equal(scope.countryCodes.length, 249);
  assert.equal(new Set(scope.countryCodes).size, 249);
  const backendPath = new URL("../../backend-nestjs/src/modules/metadata/application/contest-scope.ts", import.meta.url);
  if (existsSync(backendPath)) assert.equal(readFileSync(backendPath, "utf8"), readFileSync(new URL("../lib/product/contest-scope.ts", import.meta.url), "utf8"));
  for (const code of ["CN", "US", "GLOBAL"]) assert.ok(scope.isRegion(code));
  for (const code of ["", "UNSET", "ZZ", "cn", null]) assert.equal(scope.isRegion(code), false);
  assert.equal(scope.isRegionFilter("UNSET"), true);
});

test("read schema retains optional scope without fabricating labels on legacy data", () => {
  assert.equal(schemas.contestMetadataSchema.parse(metadata).region, undefined);
  assert.equal(schemas.contestMetadataSchema.parse({ ...metadata, region: "CN", contentLanguage: "zh" }).contentLanguage, "zh");
  assert.equal(schemas.contestMetadataSchema.safeParse({ ...metadata, region: "ZZ" }).success, false);
});

test("scoped API sends category/region for each page but global token requests stay unscoped", async () => {
  const calls = [];
  const api = load("../lib/api/contests.ts", { "./schemas": schemas, zod: { z }, "./http": { apiEndpoint: path => path, apiJson: response => response } }, {
    URLSearchParams, AbortSignal, fetch: async url => { calls.push(url); return { items: [{ ...item, metadata: { ...metadata, region: "CN", contentLanguage: "zh" } }], nextCursor: null }; },
  });
  await api.getContestPage(46630, "cursor:next", "English", { region: "CN", category: "culture" });
  const params = new URL(calls[0], "http://local").searchParams;
  assert.equal(params.get("region"), "CN"); assert.equal(params.get("category"), "culture");
  assert.equal(params.get("cursor"), "cursor:next"); assert.equal(params.get("q"), "English");
  await api.getContestPage(46630);
  assert.equal(new URL(calls[1], "http://local").searchParams.has("region"), false);
});

test("scoped reads fail closed if an old server ignores the filters", async () => {
  const api = load("../lib/api/contests.ts", { "./schemas": schemas, zod: { z }, "./http": { apiEndpoint: path => path, apiJson: response => response } }, {
    URLSearchParams, AbortSignal, fetch: async () => ({ items: [item], nextCursor: null }),
  });
  await assert.rejects(api.getContestPage(46630, undefined, "", { region: "CN" }), /scope/);
  await assert.rejects(api.getContestPage(46630, undefined, "", { category: "entertainment" }), /scope/);
  assert.equal((await api.getContestPage(46630, undefined, "", { region: "UNSET" })).items.length, 1);
});

test("metadata preparation rejects dropped scope before any wallet operation", async () => {
  let responseMetadata = { ...metadata, version: 1, creator: address, referenceUrl: null, createdAt: "2026-09-09T00:00:00.000Z", sideA: { ...metadata.sideA, logoUrl: null }, sideB: { ...metadata.sideB, logoUrl: null } };
  const api = load("../lib/api/metadata.ts", { "./schemas": schemas, "./http": { apiEndpoint: path => path, apiJson: response => response } }, {
    fetch: async () => ({ metadataHash: hash, metadataUri: "https://example.com/metadata", metadata: responseMetadata }),
  });
  const input = { region: "CN", contentLanguage: "zh" };
  await assert.rejects(api.prepareContestMetadata(input, "local-test-only"), /did not preserve/);
  responseMetadata = { ...responseMetadata, region: "CN", contentLanguage: "en" };
  await assert.rejects(api.prepareContestMetadata(input, "local-test-only"), /did not preserve/);
  responseMetadata.contentLanguage = "zh";
  assert.equal((await api.prepareContestMetadata(input, "local-test-only")).metadata.region, "CN");
});
