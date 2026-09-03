import { contestCardResponse } from "@/lib/share/contest-card-image";

const contestIdPattern = /^0x[0-9a-fA-F]{64}$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  if (!contestIdPattern.test(contestId)) {
    return new Response("contest not found", { status: 404 });
  }
  const version = new URL(_request.url).searchParams.get("v") ?? "legacy";
  return contestCardResponse(contestId, version);
}
