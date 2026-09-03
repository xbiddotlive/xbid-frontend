import ContestOpenGraphImage from "@/app/(platform)/contest/[contestId]/opengraph-image";

const contestIdPattern = /^0x[0-9a-fA-F]{64}$/;

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  if (!contestIdPattern.test(contestId)) {
    return new Response("contest not found", { status: 404 });
  }
  return ContestOpenGraphImage({ params: Promise.resolve({ contestId }) });
}
