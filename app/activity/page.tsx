import { ActivityIcon } from "@/components/ui/icons";
import { ActivityLedger } from "@/features/activity/components/activity-ledger";
import { getNetworkActivity } from "@/lib/api/activity";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "live activity",
  description: "Follow confirmed trades, flips, lead changes, crowns and comments across every XBID contest.",
  path: "/activity",
});

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const content = await getNetworkActivity(robinhoodTestnet.id);
  return <main className="pageShell utilityPage"><header className="pageHeader utilityIconHeader"><ActivityIcon /><div><p className="eyebrow">network pulse · live testnet</p><h1>activity</h1><span>trades, flips, lead changes, crowns and comments across every live contest.</span></div></header><ActivityLedger content={content} /></main>;
}
