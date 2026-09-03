import type { Address } from "viem";

import { apiEndpoint, apiJson } from "./http";
import { commentEligibilitySchema, commentsResponseSchema, createCommentResponseSchema } from "./schemas";

export type ContestComment = ReturnType<typeof commentsResponseSchema.parse>["comments"][number];
export type ContestCommentsResponse = ReturnType<typeof commentsResponseSchema.parse>;

type CommentInput = {
  chainId: number;
  contestId: string;
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

export async function getCommentEligibility(
  chainId: number,
  contestId: string,
  walletAddress: Address,
  signal?: AbortSignal,
) {
  const response = await fetch(
    apiEndpoint(`/v1/chains/${chainId}/contests/${encodeURIComponent(contestId)}/comments/eligibility?walletAddress=${encodeURIComponent(walletAddress)}`),
    { cache: "no-store", signal },
  );
  return commentEligibilitySchema.parse(await apiJson(response));
}

export async function createContestComment(input: CommentInput & { sessionToken: string }) {
  const response = await fetch(
    apiEndpoint(`/v1/chains/${input.chainId}/contests/${encodeURIComponent(input.contestId)}/comments`),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.sessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        body: input.body,
        parentId: input.parentId,
      }),
    },
  );
  return createCommentResponseSchema.parse(await apiJson(response));
}
