import { LeaderboardIcon } from "@/components/ui/icons";
import { LeaderboardBoard } from "@/features/leaderboard/components/leaderboard-board";
import { getLeaderboard } from "@/lib/api/leaderboard";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { pageMetadata } from "@/lib/seo/site";
import { I18nText } from "@/lib/i18n/locale-context";

export const metadata = pageMetadata({
  title: "leaderboard",
  description: "XBID Testnet rankings for realized trading profit and settled referral rewards.",
  path: "/leaderboard",
});

export default async function LeaderboardPage() {
  const content = await getLeaderboard(robinhoodTestnet.id);
  return <main className="pageShell utilityPage"><header className="pageHeader leaderboardHeader"><LeaderboardIcon /><div><p className="eyebrow"><I18nText id="page.leaderboard.eyebrow" /></p><h1><I18nText id="page.leaderboard.title" /></h1><span><I18nText id="page.leaderboard.description" /></span></div></header><LeaderboardBoard content={content} /></main>;
}
