import { activeChain } from "@/lib/blockchain/chain";
import { createRpcProxy } from "@/lib/server/rpc-proxy";

export const runtime = "nodejs";

// Fixed by deployment configuration; callers cannot supply an upstream URL.
const proxy = createRpcProxy(activeChain.rpcUrls.default.http[0], {
  appOrigin: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : undefined,
});

export async function POST(request: Request) {
  if (activeChain.id !== 5042 && activeChain.id !== 5042002) {
    return Response.json({ error: "Arc RPC route is not enabled" }, { status: 404 });
  }
  return proxy(request);
}
