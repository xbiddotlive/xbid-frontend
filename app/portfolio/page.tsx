import { PortfolioIcon } from "@/components/ui/icons";
import { PortfolioDashboard } from "@/features/portfolio/components/portfolio-dashboard";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "portfolio",
  description: "View your XBID positions, created contests and protocol earnings from one wallet workspace.",
  path: "/portfolio",
});

export default function PortfolioPage() {
  return <main className="pageShell utilityPage"><header className="pageHeader utilityIconHeader"><PortfolioIcon /><div><p className="eyebrow">wallet workspace</p><h1>portfolio</h1><span>positions, created contests and protocol earnings in one view.</span></div></header><PortfolioDashboard /></main>;
}
