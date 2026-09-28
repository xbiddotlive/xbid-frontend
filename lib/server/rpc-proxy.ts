// Read/simulation only. Signing and transaction submission stay in the wallet.
const methods = new Set([
  "eth_chainId", "eth_blockNumber", "eth_call", "eth_estimateGas",
  "eth_getBalance", "eth_getCode", "eth_getTransactionCount",
  "eth_gasPrice", "eth_maxPriorityFeePerGas", "eth_feeHistory",
  "eth_getTransactionReceipt", "eth_getTransactionByHash", "eth_getBlockByNumber",
]);
type RpcRequest = { jsonrpc: "2.0"; id: string | number; method: string; params: unknown[] };
type RpcReply = { result?: unknown; error?: { code: number; message: string; data?: unknown } };
const MAX_BYTES = 32_768;

function failure(id: unknown, status: number, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, {
    status, headers: { "cache-control": "no-store", ...(status === 429 ? { "retry-after": "5" } : {}) },
  });
}

export function createRpcProxy(upstream: string, options: {
  fetcher?: typeof fetch; intervalMs?: number; timeoutMs?: number; appOrigin?: string;
} = {}) {
  const fetcher = options.fetcher ?? fetch;
  const intervalMs = options.intervalMs ?? 1_000;
  let nextStart = 0;
  let blockedUntil = 0;
  const pending = new Map<string, Promise<RpcReply>>();
  const cache = new Map<string, { expires: number; value: RpcReply }>();

  return async function proxy(request: Request) {
    if (request.method !== "POST") return failure(null, 405, -32600, "POST required");
    const origin = request.headers.get("origin");
    if ((origin && origin !== (options.appOrigin ?? new URL(request.url).origin))
      || request.headers.get("sec-fetch-site") === "cross-site") {
      return failure(null, 403, -32600, "Cross-origin requests are not allowed");
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return failure(null, 415, -32600, "JSON required");
    }
    // Bound streamed bodies, not just the untrusted Content-Length header.
    const reader = request.body?.getReader();
    if (!reader) return failure(null, 400, -32600, "Request body required");
    const chunks: Uint8Array[] = [];
    let size = 0;
    let payload: unknown;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          return failure(null, 413, -32600, "Request too large");
        }
        chunks.push(value);
      }
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return failure(null, 400, -32700, "Invalid JSON");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return failure(null, 400, -32600, "Single JSON-RPC request required");
    }
    const rpc = payload as Partial<RpcRequest>;
    if (rpc.jsonrpc !== "2.0" || !(typeof rpc.id === "string" || typeof rpc.id === "number")
      || typeof rpc.method !== "string" || !Array.isArray(rpc.params)) {
      return failure(null, 400, -32600, "Invalid JSON-RPC request");
    }
    if (!methods.has(rpc.method)) return failure(rpc.id, 403, -32601, "RPC method not allowed");
    // Forbid state overrides and unbounded historical fee queries.
    if (rpc.params.length > 3 || ((rpc.method === "eth_call" || rpc.method === "eth_estimateGas") && rpc.params.length > 2)
      || (rpc.method === "eth_feeHistory" && (!/^0x[0-9a-f]{1,2}$/i.test(String(rpc.params[0]))
        || Number(rpc.params[0]) > 20))) {
      return failure(rpc.id, 400, -32602, "Unsupported RPC parameters");
    }
    const key = JSON.stringify([rpc.method, rpc.params]);
    const cached = cache.get(key);
    let work = pending.get(key);
    if (cached && cached.expires > Date.now()) {
      return Response.json({ jsonrpc: "2.0", id: rpc.id, ...cached.value }, { headers: { "cache-control": "no-store" } });
    }
    if (!work) {
      if (pending.size >= 8 || Date.now() < blockedUntil) return failure(rpc.id, 429, -32005, "RPC busy; retry shortly");
      const delay = Math.max(0, nextStart - Date.now());
      nextStart = Math.max(Date.now(), nextStart) + intervalMs;
      work = (async (): Promise<RpcReply> => {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (Date.now() < blockedUntil) throw new Error("RPC_RATE_LIMITED");
        const response = await fetcher(upstream, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: rpc.method, params: rpc.params }),
          cache: "no-store", redirect: "error", signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
        });
        if (response.status === 429) {
          blockedUntil = Date.now() + 5_000;
          throw new Error("RPC_RATE_LIMITED");
        }
        if (!response.ok) throw new Error("RPC_UPSTREAM_UNAVAILABLE");
        const body = await response.json();
        if (!body || body.jsonrpc !== "2.0" || body.id !== 1
          || (!("result" in body) && !(body.error && typeof body.error.code === "number" && typeof body.error.message === "string"))) {
          throw new Error("RPC_INVALID_RESPONSE");
        }
        // Preserve revert data so viem can decode contract simulation failures.
        const value: RpcReply = body.error ? { error: body.error } : { result: body.result };
        if (!body.error && body.result !== null) {
          if (cache.size >= 256) cache.clear();
          cache.set(key, { value, expires: Date.now() + 1_000 });
        }
        return value;
      })();
      pending.set(key, work);
      void work.finally(() => pending.delete(key)).catch(() => {});
    }
    try {
      return Response.json({ jsonrpc: "2.0", id: rpc.id, ...await work }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      return error instanceof Error && error.message === "RPC_RATE_LIMITED"
        ? failure(rpc.id, 429, -32005, "RPC busy; retry shortly")
        : failure(rpc.id, 502, -32603, "Chain connection unavailable; retry shortly");
    }
  };
}
