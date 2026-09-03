import type { MetadataRoute } from "next";

import { listContests } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { siteUrl } from "@/lib/seo/site";

const staticRoutes = [
  { path: "", changeFrequency: "hourly", priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.9 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.8 },
  { path: "/crowned", changeFrequency: "hourly", priority: 0.8 },
  { path: "/activity", changeFrequency: "hourly", priority: 0.7 },
  { path: "/leaderboard", changeFrequency: "daily", priority: 0.7 },
  { path: "/launch", changeFrequency: "monthly", priority: 0.7 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const contests = await listContests(robinhoodTestnet.id).catch(() => []);
  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...contests.map((contest) => ({
      url: `${siteUrl}/contest/${contest.contestId}`,
      lastModified: new Date(Number(contest.createdAt) * 1_000),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ];
}
