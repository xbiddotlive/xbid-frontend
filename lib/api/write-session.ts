import type { Address, Hex } from "viem";

import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { apiEndpoint, apiJson } from "./http";
import { writeSessionChallengeSchema, writeSessionSchema } from "./schemas";

type CachedWriteSession = { expiresAt: number; token: string };
const sessions = new Map<string, CachedWriteSession>();
const pendingSessions = new Map<string, Promise<string>>();

export async function createWriteSessionChallenge(walletAddress: Address) {
  const response = await fetch(apiEndpoint(`/v1/chains/${robinhoodTestnet.id}/write-session/challenge`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });
  return writeSessionChallengeSchema.parse(await apiJson(response));
}

export async function exchangeWriteSession(input: { challengeId: string; signature: Hex; walletAddress: Address }) {
  const response = await fetch(apiEndpoint(`/v1/chains/${robinhoodTestnet.id}/write-session`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return writeSessionSchema.parse(await apiJson(response));
}

export async function ensureWriteSession(
  walletAddress: Address,
  signMessage: (message: string) => Promise<Hex>,
) {
  const key = walletAddress.toLowerCase();
  const current = sessions.get(key);
  if (current && current.expiresAt > Date.now() + 30_000) return current.token;
  const pending = pendingSessions.get(key);
  if (pending) return pending;

  const request = (async () => {
    const challenge = await createWriteSessionChallenge(walletAddress);
    const signature = await signMessage(challenge.message);
    const session = await exchangeWriteSession({ challengeId: challenge.challengeId, signature, walletAddress });
    sessions.set(key, { expiresAt: Date.parse(session.expiresAt), token: session.token });
    return session.token;
  })();
  pendingSessions.set(key, request);
  try {
    return await request;
  } finally {
    pendingSessions.delete(key);
  }
}
