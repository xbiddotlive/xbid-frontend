import { contestCardResponse } from "@/lib/share/contest-card-image";

const contestIdPattern = /^0x[0-9a-fA-F]{64}$/;
const versionPattern = /^[45]-[0-9]+$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contestId: string; version: string }> },
) {
  const { contestId, version } = await params;
  if (!contestIdPattern.test(contestId) || !versionPattern.test(version)) {
    return new Response("contest card not found", { status: 404 });
  }
  return contestCardResponse(contestId, version, "jpeg");
}
