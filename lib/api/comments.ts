import type { Address, Hex } from "viem";

import { apiEndpoint, apiJson } from "./http";
import { commentChallengeSchema, commentsResponseSchema, createCommentResponseSchema } from "./schemas";

export type ContestComment = ReturnType<typeof commentsResponseSchema.parse>["comments"][number];
export type ContestCommentsResponse = ReturnType<typeof commentsResponseSchema.parse>;

type CommentInput = {
  chainId: number;
  contestId: string;
  walletAddress: Address;
  body: string;
  parentId?: string;
};

export async function listContestComments(chainId: number, contestId: string, signal?: AbortSignal) {
  const response = await fetch(
    apiEndpoint(`/v1/chains/${chainId}/contests/${encodeURIComponent(contestId)}/comments`),
    { cache: "no-store", signal },
  );
  return commentsResponseSchema.parse(await apiJson(response));
}

export async function createCommentChallenge(input: CommentInput) {
  const response = await fetch(
    apiEndpoint(`/v1/chains/${input.chainId}/contests/${encodeURIComponent(input.contestId)}/comments/challenge`),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ walletAddress: input.walletAddress, body: input.body, parentId: input.parentId }),
    },
  );
  return commentChallengeSchema.parse(await apiJson(response));
}

export async function createContestComment(input: CommentInput & { challengeId: string; signature: Hex }) {
  const response = await fetch(
    apiEndpoint(`/v1/chains/${input.chainId}/contests/${encodeURIComponent(input.contestId)}/comments`),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        walletAddress: input.walletAddress,
        body: input.body,
        parentId: input.parentId,
        challengeId: input.challengeId,
        signature: input.signature,
      }),
    },
  );
  return createCommentResponseSchema.parse(await apiJson(response));
}
