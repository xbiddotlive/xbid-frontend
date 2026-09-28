import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon, CrownIcon, InfoIcon } from "@/components/ui/icons";
import { contracts } from "@/lib/blockchain/contracts";
import { activeChain } from "@/lib/blockchain/chain";
import { I18nText } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { feeRows } from "@/lib/product/education";
import { companyName, pageMetadata, siteUrl } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "docs",
  description: "XBID business rules, live market mechanics, fees, crown thresholds, referrals and network safety information.",
  path: "/docs",
});

const docsSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "xbid.live product rules and network documentation",
  description: "Business rules, market mechanics, fees, crown thresholds and safety information for xbid.live.",
  dateModified: "2026-09-03",
  author: { "@type": "Organization", name: companyName },
  publisher: { "@type": "Organization", name: companyName },
  mainEntityOfPage: `${siteUrl}/docs`,
};

const explorer = `${activeChain.blockExplorers.default.url}/address`;
const docSections = ["overview", "trading", "pricing", "fees", "crown", "referrals", "launch", "comments", "risk", "contracts"] as const;
const feeKeys = ["trading", "protocol", "creator", "referrer", "creation"] as const;

export default function DocsPage() {
  return <>
    <JsonLd data={docsSchema} />
    <main className="pageShell docsPage">
      <header className="docsHero"><div><p className="eyebrow"><I18nText id="docs.eyebrow" /></p><h1><I18nText id="docs.title" /></h1><p><I18nText id="docs.description" /></p></div><Link className="button buttonQuiet" href="/how-it-works"><I18nText id="docs.start" /> <ArrowIcon /></Link></header>
      <div className="docsLayout">
        <aside className="docsNav"><strong id="docs-navigation-label"><I18nText id="docs.onPage" /></strong><nav aria-labelledby="docs-navigation-label">{docSections.map((section) => <a href={`#${section}`} key={section}><I18nText id={`docs.nav.${section}` as MessageKey} /></a>)}</nav></aside>
        <article className="docsContent">
          <section id="overview"><header><span><InfoIcon /></span><h2><I18nText id="docs.nav.overview" /></h2></header><p><I18nText id="docs.overview" /></p><div className="docsCallout"><strong><I18nText id="docs.distinction" /></strong><p><I18nText id="docs.distinctionText" /></p></div></section>

          <section id="trading"><header><span>↗</span><h2><I18nText id="docs.nav.trading" /></h2></header><div className="docsRuleGrid"><div><strong><I18nText id="trade.buy" /></strong><p><I18nText id="docs.buy" /></p></div><div><strong><I18nText id="trade.sell" /></strong><p><I18nText id="docs.sell" /></p></div><div><strong><I18nText id="trade.flip" /></strong><p><I18nText id="docs.flip" /></p></div></div><p><I18nText id="docs.tradingText" /></p></section>

          <section id="pricing"><header><span>≈</span><h2><I18nText id="docs.nav.pricing" /></h2></header><p><I18nText id="docs.pricingText" /></p><dl className="docsDefinitions"><div><dt><I18nText id="docs.price" /></dt><dd><I18nText id="docs.priceText" /></dd></div><div><dt><I18nText id="docs.control" /></dt><dd><I18nText id="docs.controlText" /></dd></div><div><dt><I18nText id="portfolio.liquidity" /></dt><dd><I18nText id="docs.liquidityText" /></dd></div><div><dt><I18nText id="trade.slippage" /></dt><dd><I18nText id="docs.slippageText" /></dd></div></dl></section>

          <section id="fees"><header><span>%</span><h2><I18nText id="docs.nav.fees" /></h2></header><p><I18nText id="docs.feesText" /></p><div className="docsFeeTable"><div className="docsFeeHead"><span><I18nText id="docs.item" /></span><span><I18nText id="docs.rate" /></span><span><I18nText id="docs.howWorks" /></span></div>{feeRows.map((row, index) => <div key={row.label}><strong><I18nText id={`docs.fee.${feeKeys[index]}.label` as MessageKey} /></strong><b>{row.value}</b><span><I18nText id={`docs.fee.${feeKeys[index]}.note` as MessageKey} /></span></div>)}</div><div className="docsCallout"><strong><I18nText id="docs.example" /></strong><p><I18nText id="docs.exampleText" /></p></div></section>

          <section id="crown"><header><span><CrownIcon /></span><h2><I18nText id="docs.nav.crown" /></h2></header><ol className="docsTimeline">{(["activation", "assignment", "challenge", "takeover", "defense"] as const).map((item) => <li key={item}><strong><I18nText id={`docs.crown.${item}` as MessageKey} /></strong><span><I18nText id={`docs.crown.${item}Text` as MessageKey} /></span></li>)}</ol><p><I18nText id="docs.crown.finalize" /></p></section>

          <section id="referrals"><header><span>◎</span><h2><I18nText id="docs.referralsTitle" /></h2></header><p><I18nText id="docs.referralsText" /></p></section>

          <section id="launch"><header><span>+</span><h2><I18nText id="docs.launchTitle" /></h2></header><p><I18nText id="docs.launchText" /></p><ul>{[1, 2, 3, 4].map((item) => <li key={item}><I18nText id={`docs.launch.${item}` as MessageKey} /></li>)}</ul></section>

          <section id="comments"><header><span>“</span><h2><I18nText id="docs.commentsTitle" /></h2></header><p><I18nText id="docs.commentsText" /></p><ul>{[1, 2, 3, 4, 5].map((item) => <li key={item}><I18nText id={`docs.comments.${item}` as MessageKey} /></li>)}</ul><div className="docsCallout"><strong><I18nText id="docs.tradeGated" /></strong><p><I18nText id="docs.tradeGatedText" /></p></div></section>

          <section id="risk"><header><span>!</span><h2><I18nText id="docs.riskTitle" /></h2></header><div className="docsRuleGrid"><div><strong><I18nText id="docs.normal" /></strong><p><I18nText id="docs.normalText" /></p></div><div><strong><I18nText id="docs.riskOff" /></strong><p><I18nText id="docs.riskOffText" /></p></div><div><strong><I18nText id="docs.fullPause" /></strong><p><I18nText id="docs.fullPauseText" /></p></div></div><div className="docsWarning"><strong><I18nText id="docs.testnetNotice" /></strong><p><I18nText id="docs.testnetNoticeText" /></p></div></section>

          <section id="contracts"><header><span>◇</span><h2><I18nText id="docs.contractsTitle" /></h2></header><div className="docsContracts">{Object.entries(contracts).map(([name, address]) => <a href={`${explorer}/${address}`} key={name} rel="noreferrer" target="_blank"><span>{name.replace(/([A-Z])/g, " $1").toLowerCase()}</span><code>{address}</code><b>↗</b></a>)}</div><p><I18nText id="docs.networkText" /></p></section>
        </article>
      </div>
    </main>
  </>;
}
