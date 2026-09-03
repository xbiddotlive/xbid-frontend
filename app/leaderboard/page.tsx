import { LeaderboardIcon } from "@/components/ui/icons";
import { LeaderboardBoard } from "@/features/leaderboard/components/leaderboard-board";
import { getLeaderboard } from "@/lib/api/leaderboard";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "leaderboard",
  description: "XBID Testnet rankings for realized trading profit and settled referral rewards.",
  path: "/leaderboard",
});

export default async function LeaderboardPage() {
  const content = await getLeaderboard(robinhoodTestnet.id);
  return <main className="pageShell utilityPage"><header className="pageHeader leaderboardHeader"><LeaderboardIcon /><div><p className="eyebrow">arena performance · live testnet</p><h1>leaderboard</h1><span>ranked by realized trading profit or settled referral rewards.</span></div></header><LeaderboardBoard content={content} /></main>;
}
