import { ActivityIcon } from "@/components/ui/icons";
import { ActivityLedger } from "@/features/activity/components/activity-ledger";
import { getNetworkActivity } from "@/lib/api/activity";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { pageMetadata } from "@/lib/seo/site";
import { I18nText } from "@/lib/i18n/locale-context";

export const metadata = pageMetadata({
  title: "live activity",
  description: "Follow confirmed trades, flips, lead changes, crowns and comments across every XBID contest.",
  path: "/activity",
});

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const content = await getNetworkActivity(robinhoodTestnet.id);
  return <main className="pageShell utilityPage"><header className="pageHeader utilityIconHeader"><ActivityIcon /><div><p className="eyebrow"><I18nText id="page.activity.eyebrow" /></p><h1><I18nText id="page.activity.title" /></h1><span><I18nText id="page.activity.description" /></span></div></header><ActivityLedger content={content} /></main>;
}
