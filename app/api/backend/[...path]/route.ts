import { NextRequest } from "next/server";

const apiUrl = process.env.API_INTERNAL_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "http://localhost:4000";

async function proxy(request: NextRequest, context: RouteContext<"/api/backend/[...path]">) {
  const { path } = await context.params;
  if (path[0] !== "v1") return Response.json({ code: "PROXY_PATH_NOT_ALLOWED" }, { status: 404 });
  const upstream = new URL(path.map(encodeURIComponent).join("/"), `${apiUrl.replace(/\/$/, "")}/`);
  upstream.search = request.nextUrl.search;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  if (body && body.byteLength > 2_200_000) {
    return Response.json({ code: "REQUEST_TOO_LARGE" }, { status: 413 });
  }
  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });
  const responseHeaders = new Headers();
  const responseType = response.headers.get("content-type");
  if (responseType) responseHeaders.set("content-type", responseType);
  const immutableAsset = request.method === "GET"
    && path[1] === "assets"
    && /^0x[0-9a-fA-F]{64}$/.test(path[2] ?? "");
  responseHeaders.set(
    "cache-control",
    immutableAsset ? "public, max-age=31536000, immutable" : "no-store",
  );
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
