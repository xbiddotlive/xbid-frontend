import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(path, extra = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const context = { exports: {}, Request, Response, Buffer, AbortSignal, URL, setTimeout, fetch, ...extra };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports;
}
const { createRpcProxy } = load("../lib/server/rpc-proxy.ts");
const upstream = "https://rpc.mainnet.arc.io";
const rpc = (id = 1, method = "eth_getBalance", params = ["0x123", "latest"]) => ({ jsonrpc: "2.0", id, method, params });
const request = (body = rpc(), headers = {}) => new Request("https://xbid.live/api/chain", {
  method: "POST", headers: { "content-type": "application/json", origin: "https://xbid.live", ...headers }, body: JSON.stringify(body),
});
const success = (result = "0x123") => Response.json({ jsonrpc: "2.0", id: 1, result });

test("same-origin reads use only configured upstream and never forward auth/cookies", async () => {
  const proxy = createRpcProxy(upstream, { intervalMs: 0, fetcher: async (url, options) => {
    assert.equal(url, upstream);
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.deepEqual(Object.keys(options.headers), ["content-type"]);
    assert.equal(JSON.parse(options.body).id, 1);
    return success();
  } });
  const response = await proxy(request(rpc("client-id"), { authorization: "Bearer never-forward", cookie: "never-forward" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { jsonrpc: "2.0", id: "client-id", result: "0x123" });
});

test("deployment origin works behind internal reverse proxy URLs", async () => {
  const proxy = createRpcProxy(upstream, { appOrigin: "https://xbid.live", fetcher: async () => success() });
  const req = new Request("http://localhost:3000/api/chain", { method: "POST", headers: { origin: "https://xbid.live", "content-type": "application/json" }, body: JSON.stringify(rpc()) });
  assert.equal((await proxy(req)).status, 200);
  assert.equal((await proxy(request(rpc(), { origin: "https://evil.example" }))).status, 403);
});

test("rejects signing, sending, log scans, batches, state overrides and large bodies without upstream calls", async () => {
  const proxy = createRpcProxy(upstream, { fetcher: async () => { assert.fail("must not call upstream"); } });
  for (const method of ["eth_sendRawTransaction", "eth_sendTransaction", "personal_sign", "debug_traceTransaction", "eth_getLogs", "eth_newFilter"]) {
    assert.equal((await proxy(request(rpc(1, method)))).status, 403);
  }
  assert.equal((await proxy(request([rpc()]))).status, 400);
  assert.equal((await proxy(request(rpc(1, "eth_call", [{}, "latest", {}])))).status, 400);
  assert.equal((await proxy(request(rpc(1, "eth_feeHistory", ["0xffff", "latest", []])))).status, 400);
  assert.equal((await proxy(request(rpc(), { "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await proxy(request(rpc(), { "content-type": "text/plain" }))).status, 415);
  assert.equal((await proxy(request({ ...rpc(), padding: "x".repeat(33_000) }))).status, 413);
  assert.equal((await proxy(new Request("https://xbid.live/api/chain"))).status, 405);
});

test("coalesces identical reads while preserving each request id", async () => {
  let calls = 0;
  const proxy = createRpcProxy(upstream, { intervalMs: 0, fetcher: async () => { calls++; await new Promise((r) => setTimeout(r, 10)); return success(); } });
  const replies = await Promise.all([1, 2, 3].map(async (id) => (await proxy(request(rpc(id)))).json()));
  assert.equal(calls, 1);
  assert.deepEqual(replies.map((r) => r.id), [1, 2, 3]);
  assert.equal((await (await proxy(request(rpc(4)))).json()).id, 4);
  assert.equal(calls, 1);
});

test("queue is bounded and calls are paced", async () => {
  const starts = [];
  const proxy = createRpcProxy(upstream, { intervalMs: 12, fetcher: async () => { starts.push(Date.now()); await new Promise((r) => setTimeout(r, 15)); return success(); } });
  const replies = await Promise.all(Array.from({ length: 9 }, (_, i) => proxy(request(rpc(i, "eth_getBalance", [`0x${i}`, "latest"])))));
  assert.equal(replies.filter((r) => r.status === 429).length, 1);
  assert.equal(starts.length, 8);
  assert.ok(starts.at(-1) - starts[0] >= 65);
});

test("upstream rate limits back off, outages do not masquerade as zero balance", async () => {
  let calls = 0;
  const proxy = createRpcProxy(upstream, { fetcher: async () => { calls++; return new Response("limited", { status: 429 }); } });
  const first = await proxy(request());
  assert.equal(first.status, 429);
  assert.equal(first.headers.get("retry-after"), "5");
  assert.equal((await proxy(request())).status, 429);
  assert.equal(calls, 1);
  for (const fetcher of [async () => { throw new Error("private upstream detail"); }, async () => Response.json({ wrong: true }), async () => new Response("error", { status: 500 })]) {
    const response = await createRpcProxy(upstream, { fetcher })(request());
    assert.equal(response.status, 502);
    const json = await response.json();
    assert.equal(json.result, undefined);
    assert.equal(json.error.message, "Chain connection unavailable; retry shortly");
  }
});

test("receipt pending null is not cached and simulation revert data is retained", async () => {
  let calls = 0;
  const proxy = createRpcProxy(upstream, { intervalMs: 0, fetcher: async () => { calls++; return success(null); } });
  await proxy(request(rpc(1, "eth_getTransactionReceipt", ["0xabc"])));
  await proxy(request(rpc(2, "eth_getTransactionReceipt", ["0xabc"])));
  assert.equal(calls, 2);
  const error = { code: 3, message: "execution reverted", data: "0xdeadbeef" };
  const revert = createRpcProxy(upstream, { fetcher: async () => Response.json({ jsonrpc: "2.0", id: 1, error }) });
  assert.deepEqual((await (await revert(request())).json()).error, error);
});

test("browser Arc transports are same-origin, other chains and SSR retain upstream", () => {
  for (const id of [5042, 5042002, 8453, 46630]) for (const browser of [true, false]) {
    const chain = { id, rpcUrls: { default: { http: [upstream] } } };
    const dependencies = {
      "@rainbow-me/rainbowkit": {}, "@rainbow-me/rainbowkit/wallets": {},
      wagmi: { cookieStorage: {}, createStorage: () => ({}), createConfig: (x) => x, http: (url) => url },
      "wagmi/connectors": { injected: () => ({}) }, "./chain": { robinhoodTestnet: chain },
    };
    const { wagmiConfig } = load("../lib/blockchain/config.ts", { process: { env: { NODE_ENV: "production" } }, ...(browser ? { window: {} } : {}), require: (id) => dependencies[id] });
    assert.equal(wagmiConfig.transports[id], browser && [5042, 5042002].includes(id) ? "/api/chain" : upstream);
    assert.equal(chain.rpcUrls.default.http[0], upstream);
  }
});

test("launch keeps unknown balances distinct from zero and checks fresh reads before metadata", () => {
  const hook = readFileSync(new URL("../features/launch/hooks/use-launch-contest.ts", import.meta.url), "utf8");
  const builder = readFileSync(new URL("../features/launch/components/launch-builder.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(hook, /data: balance = 0n/);
  assert.match(hook, /balanceRead\.error \|\| balanceRead\.data === undefined/);
  assert.ok(hook.indexOf("const balanceRead =") < hook.indexOf("const writeToken ="));
  assert.match(builder, /balanceError \? t\("launch.balanceError"\)/);
  assert.match(builder, /balance === undefined \? t\("launch.balanceLoading"\)/);
});
