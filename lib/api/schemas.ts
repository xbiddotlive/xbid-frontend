import { z } from "zod";
import { isRegion, contentLanguages } from "@/lib/product/contest-scope";

const decimalString = z.string().regex(/^-?\d+$/);
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const bytes32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const freshnessSchema = z.object({
  chainBlock: decimalString,
  indexedBlock: decimalString,
  lagBlocks: decimalString,
  chainAvailable: z.boolean(),
  asOf: z.iso.datetime(),
});

export const tradeSchema = z.object({
  transactionHash: bytes32,
  logIndex: z.number().int().nonnegative(),
  trader: address.optional(),
  kind: z.string(),
  side: z.number().int().min(0).max(1),
  grossUnits: decimalString.optional(),
  qAAfterWei: decimalString,
  qBAfterWei: decimalString,
  reserveAfterUnits: decimalString,
  blockNumber: decimalString,
  blockTimestamp: decimalString,
});

export const stockReferencesSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]{2,64}$/),
  symbol: z.string().min(1).max(16),
  name: z.string().min(1).max(100),
  exchange: z.string().min(1).max(32),
})).min(1).max(2).refine(items => new Set(items.map(item => item.id)).size === items.length);

export const contestMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  category: z.string(),
  stocks: stockReferencesSchema.optional(),
  region: z.string().refine(isRegion).optional(),
  contentLanguage: z.enum(contentLanguages).optional(),
  referenceUrl: z.url().optional(),
  sideA: z.object({ name: z.string().min(1), symbol: z.string().min(1), logoUrl: z.string().optional() }),
  sideB: z.object({ name: z.string().min(1), symbol: z.string().min(1), logoUrl: z.string().optional() }),
});

export const marketSchema = z.object({
  qAWei: decimalString,
  qBWei: decimalString,
  reserveUnits: decimalString,
  cumulativeVolumeUnits: decimalString,
  cumulativeFeeUnits: decimalString,
  tradeCount: decimalString,
  volume24hUnits: decimalString,
  tradeCount24h: decimalString,
  uniqueTraders24h: decimalString,
  sideAVolume24hUnits: decimalString,
  sideBVolume24hUnits: decimalString,
  sideATradeCount24h: decimalString,
  sideBTradeCount24h: decimalString,
  sideANetFlow24hUnits: decimalString,
  sideBNetFlow24hUnits: decimalString,
  atomicFlipCount24h: decimalString,
  leadFlipCount24h: decimalString,
  qA24hAgoWei: decimalString.nullable(),
  qB24hAgoWei: decimalString.nullable(),
  // Solidity CrownSide: None=0, A=1, B=2. The indexer persists only assigned A/B values.
  crownSide: z.union([z.literal(1), z.literal(2)]).nullable(),
  crownActivated: z.boolean(),
  crownSince: decimalString.nullable(),
  commentCount: decimalString,
  updatedBlock: decimalString,
  history: z.array(tradeSchema).default([]),
});

export const contestSchema = z.object({
  chainId: decimalString,
  contestId: bytes32,
  marketVault: address,
  creator: address,
  sideAToken: address,
  sideBToken: address,
  marketVersion: z.number().int().positive(),
  metadataHash: bytes32,
  createdBlock: decimalString,
  createdAt: z.string(),
  metadata: contestMetadataSchema,
  market: marketSchema.nullable(),
});

export const contestListSchema = z.object({ items: z.array(contestSchema), nextCursor: z.string().nullable(), freshness: freshnessSchema.optional() });
export const tradeListSchema = z.object({ items: z.array(tradeSchema), nextCursor: z.string().nullable(), freshness: freshnessSchema.optional() });

export const positionSchema = z.object({
  id: z.string(), side: z.union([z.literal(0), z.literal(1)]), tokenSymbol: z.string(),
  tokenBalance: z.string(), averageEntryPriceUsdc: z.string(), currentPriceUsdc: z.string(),
  costBasisUsdc: z.string(), marketValueUsdc: z.string(), unrealizedPnlUsdc: z.string(),
  unrealizedPnlPercent: z.number(), change24hPercent: z.number(),
  costBasisSource: z.enum(["indexed_trades", "unavailable"]).optional(),
});
export const positionsResponseSchema = z.object({
  chainId: decimalString, contestId: bytes32, walletAddress: address,
  dataSource: z.literal("indexed"), positions: z.array(positionSchema), freshness: freshnessSchema.optional(),
});

export const commentSchema = z.object({
  id: z.string(), contestId: bytes32, authorAddress: address, authorName: z.string().optional(),
  body: z.string(), createdAt: z.iso.datetime(), parentId: z.string().nullable(), likes: z.number().int().nonnegative(),
  positionSideAtPost: z.enum(["A", "B", "BOTH", "NONE", "UNVERIFIED"]),
});
export const commentsResponseSchema = z.object({
  chainId: decimalString, contestId: bytes32, dataSource: z.literal("indexed"), comments: z.array(commentSchema),
  nextCursor: z.string().nullable(), freshness: freshnessSchema.optional(),
});
export const commentChallengeSchema = z.object({ challengeId: z.uuid(), message: z.string().min(1), expiresAt: z.iso.datetime() });
export const createCommentResponseSchema = z.object({ dataSource: z.literal("indexed"), comment: commentSchema });
export const commentEligibilitySchema = z.object({
  walletAddress: address,
  eligible: z.boolean(),
  cumulativeBuyUnits: decimalString,
  minimumBuyUnits: decimalString,
  positionSide: z.enum(["A", "B", "BOTH", "NONE", "UNVERIFIED"]),
});

export const writeSessionChallengeSchema = commentChallengeSchema;
export const writeSessionSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/i),
  expiresAt: z.iso.datetime(),
  walletAddress: address,
});

export const uploadedAssetSchema = z.object({
  contentHash: bytes32,
  url: z.url(),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  byteSize: z.number().int().positive().max(2 * 1024 * 1024),
});

export const preparedContestMetadataSchema = z.object({
  metadataHash: bytes32,
  metadataUri: z.url(),
  metadata: z.object({
    version: z.literal(1),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    stocks: stockReferencesSchema.optional(),
    region: z.string().refine(isRegion).optional(),
    contentLanguage: z.enum(contentLanguages).optional(),
    creator: address,
    referenceUrl: z.url().nullable(),
    createdAt: z.iso.datetime(),
    sideA: z.object({ name: z.string(), symbol: z.string(), logoUrl: z.url().nullable() }),
    sideB: z.object({ name: z.string(), symbol: z.string(), logoUrl: z.url().nullable() }),
  }),
});

export const walletPortfolioSchema = z.object({
  chainId: decimalString,
  walletAddress: address,
  dataSource: z.literal("indexed"),
  summary: z.object({
    positionValueUsdc: z.string(),
    unrealizedPnlUsdc: z.string(),
    claimableUnits: decimalString,
    creatorEarnedUnits: decimalString,
    referralEarnedUnits: decimalString,
  }),
  positions: z.array(positionSchema.extend({ contestId: bytes32, marketTitle: z.string() })),
  created: z.array(z.object({
    contestId: bytes32,
    title: z.string(),
    liquidityUnits: decimalString,
    tradeCount: decimalString,
    creatorEarnedUnits: decimalString,
    status: z.literal("live"),
  })),
  activity: z.array(z.object({
    transactionHash: bytes32,
    contestId: bytes32,
    marketTitle: z.string(),
    kind: z.string(),
    side: z.number().int().min(0).max(1),
    grossUnits: decimalString,
    blockTimestamp: decimalString,
  })),
  partial: z.boolean(),
  freshness: freshnessSchema.optional(),
});

export const networkActivitySchema = z.object({
  chainId: decimalString,
  dataSource: z.literal("indexed"),
  window: z.literal("24h"),
  summary: z.object({ volumeUnits: decimalString, tradeCount: decimalString, flipCount: decimalString, commentCount: decimalString }),
  events: z.array(z.object({
    id: z.string().min(1),
    kind: z.enum(["trade", "flip", "lead_change", "crown", "comment"]),
    action: z.string(),
    transactionHash: bytes32.nullable(),
    actor: address.nullable(),
    contestId: bytes32,
    marketTitle: z.string(),
    side: z.number().int().min(0).max(1).nullable(),
    amountUnits: decimalString,
    occurredAt: decimalString,
  })),
  freshness: freshnessSchema.optional(),
});

export const leaderboardSchema = z.object({
  chainId: decimalString,
  dataSource: z.literal("indexed"),
  summary: z.object({
    rankedTraders: z.number().int().nonnegative(),
    topRealizedPnlUnits: decimalString,
    referralRewardsUnits: decimalString,
    referredVolumeUnits: decimalString,
    creators: z.number().int().nonnegative(),
    creatorRewardsUnits: z.string().regex(/^\d+$/),
  }),
  trading: z.array(z.object({
    address,
    realizedPnlUnits: decimalString,
    roiPercent: z.number(),
    winRatePercent: z.number(),
    volumeUnits: decimalString,
    tradeCount: z.number().int().nonnegative(),
    currentStreak: z.number().int().nonnegative(),
  })),
  referrals: z.array(z.object({
    address,
    rewardsUnits: decimalString,
    referredTraders: decimalString,
    referredTrades: decimalString,
    volumeUnits: decimalString,
    rewardShare: z.number(),
  })),
  creators: z.array(z.object({
    address,
    contestCount: z.number().int().positive(),
    creatorEarnedUnits: z.string().regex(/^\d+$/),
  })),
  freshness: freshnessSchema.optional(),
});
