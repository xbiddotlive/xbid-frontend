import { notFound } from "next/navigation";

import { ContestDetail } from "@/widgets/contest-detail/contest-detail";
import { demoContest } from "@/lib/blockchain/contracts";

export default async function ContestPage({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
  const { contestId } = await params;
  if (contestId.toLowerCase() !== demoContest.contestId.toLowerCase()) notFound();

  return <ContestDetail />;
}
