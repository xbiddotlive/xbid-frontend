import { EarningsOverview } from "@/features/portfolio/components/earnings-overview";
import { pageMetadata } from "@/lib/seo/site";
import { I18nText } from "@/lib/i18n/locale-context";

export const metadata = pageMetadata({
  title: "earnings",
  description: "Review and claim XBID creator fee shares and referral rewards from the onchain FeeVault.",
  path: "/portfolio/earnings",
});

export default function EarningsPage() {
  return <main className="pageShell utilityPage"><header className="pageHeader"><p className="eyebrow"><I18nText id="nav.portfolio" /></p><h1><I18nText id="page.earnings.title" /></h1><span><I18nText id="page.earnings.description" /></span></header><EarningsOverview /></main>;
}
