import { EarningsOverview } from "@/features/portfolio/components/earnings-overview";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "earnings",
  description: "Review and claim XBID creator fee shares and referral rewards from the onchain FeeVault.",
  path: "/portfolio/earnings",
});

export default function EarningsPage() {
  return <main className="pageShell utilityPage"><header className="pageHeader"><p className="eyebrow">portfolio</p><h1>earnings</h1><span>claimable creator fees and referral rewards.</span></header><EarningsOverview /></main>;
}
