import { contestCardResponse } from "@/lib/share/contest-card-image";
import { contestShareCardFormat } from "@/lib/share/contest-card-version";

const contestIdPattern = /^0x[0-9a-fA-F]{64}$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contestId: string; version: string }> },
) {
  const { contestId, version } = await params;
  if (!contestIdPattern.test(contestId) || contestShareCardFormat(version) !== "jpeg") {
    return new Response("contest card not found", { status: 404 });
  }
  return contestCardResponse(contestId, version, "jpeg");
}
