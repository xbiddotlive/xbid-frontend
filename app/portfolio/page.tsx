import { PortfolioIcon } from "@/components/ui/icons";
import { PortfolioDashboard } from "@/features/portfolio/components/portfolio-dashboard";
import { pageMetadata } from "@/lib/seo/site";
import { I18nText } from "@/lib/i18n/locale-context";

export const metadata = pageMetadata({
  title: "portfolio",
  description: "View your XBID positions, created contests and protocol earnings from one wallet workspace.",
  path: "/portfolio",
});

export default function PortfolioPage() {
  return <main className="pageShell utilityPage"><header className="pageHeader utilityIconHeader"><PortfolioIcon /><div><p className="eyebrow"><I18nText id="page.portfolio.eyebrow" /></p><h1><I18nText id="page.portfolio.title" /></h1><span><I18nText id="page.portfolio.description" /></span></div></header><PortfolioDashboard /></main>;
}
