export type IndexedMarket = {
  qAWei: string;
  qBWei: string;
  reserveUnits: string;
  cumulativeVolumeUnits: string;
  cumulativeFeeUnits: string;
  tradeCount: string;
  crownSide: number | null;
  crownActivated: boolean;
  updatedBlock: string;
};

export type IndexedContest = {
  chainId: string;
  contestId: string;
  marketVault: string;
  creator: string;
  sideAToken: string;
  sideBToken: string;
  marketVersion: number;
  metadataHash: string;
  createdBlock: string;
  createdAt: string;
  market: IndexedMarket | null;
};

type ContestListResponse = {
  items: IndexedContest[];
  nextCursor: string | null;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function listContests(chainId: number): Promise<IndexedContest[]> {
  const response = await fetch(`${apiUrl}/v1/chains/${chainId}/contests`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });

  if (!response.ok) {
    throw new Error(`Contest API returned ${response.status}`);
  }

  const data = (await response.json()) as ContestListResponse;
  return data.items;
}
