import Link from "next/link";

import { ExploreFooter } from "@/components/navigation/explore-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon, CrownIcon, InfoIcon } from "@/components/ui/icons";
import { contracts } from "@/lib/blockchain/contracts";
import { feeRows } from "@/lib/product/education";
import { companyName, pageMetadata, siteUrl } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "docs",
  description: "XBID business rules, live market mechanics, fees, crown thresholds, referrals and Testnet safety information.",
  path: "/docs",
});

const docsSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "xbid.live product rules and Testnet documentation",
  description: "Business rules, market mechanics, fees, crown thresholds and safety information for xbid.live.",
  dateModified: "2026-09-03",
  author: { "@type": "Organization", name: companyName },
  publisher: { "@type": "Organization", name: companyName },
  mainEntityOfPage: `${siteUrl}/docs`,
};

const explorer = "https://explorer.testnet.chain.robinhood.com/address";

export default function DocsPage() {
  return <>
    <JsonLd data={docsSchema} />
    <main className="pageShell docsPage">
      <header className="docsHero"><div><p className="eyebrow">product documentation · market version 1</p><h1>xbid rules, mechanics and fees</h1><p>the practical reference for trading, launching contests, earning rewards and understanding how live control works on robinhood chain testnet.</p></div><Link className="button buttonQuiet" href="/how-it-works">start with how it works <ArrowIcon /></Link></header>
      <div className="docsLayout">
        <aside className="docsNav"><strong>on this page</strong><nav aria-label="documentation sections"><a href="#overview">overview</a><a href="#trading">trading</a><a href="#pricing">pricing and control</a><a href="#fees">fees</a><a href="#crown">crown rules</a><a href="#referrals">referrals</a><a href="#launch">launching</a><a href="#comments">comments and data</a><a href="#risk">risk modes</a><a href="#contracts">contracts</a></nav></aside>
        <article className="docsContent">
          <section id="overview"><header><span><InfoIcon /></span><h2>overview</h2></header><p>each contest has exactly two sides and one live market vault. buying mints the selected side token, selling burns it, and flipping exchanges one side for the other atomically. prices are continuous and change with market quantity.</p><div className="docsCallout"><strong>important distinction</strong><p>xbid is not a binary prediction market that waits for an outside event result. there is no winner-takes-all resolution payout in market version 1. users realize value by selling or flipping at the current onchain quote.</p></div></section>

          <section id="trading"><header><span>↗</span><h2>trading</h2></header><div className="docsRuleGrid"><div><strong>buy</strong><p>spend test usdc to mint a side token. the minimum gross buy is 1 test usdc.</p></div><div><strong>sell</strong><p>burn a side token for test usdc. a normal sell needs at least 1 test usdc gross output; sell all can close smaller dust.</p></div><div><strong>flip</strong><p>burn the source side and mint the opposite side in one transaction. minimum source gross output is 50 test usdc.</p></div></div><p>the quick trade panel shows the current quote, minimum received amount, balance, slippage and deadline before wallet submission. token approval may be required before a sell or flip.</p></section>

          <section id="pricing"><header><span>≈</span><h2>pricing and control</h2></header><p>market version 1 uses an automated logarithmic market scoring curve. a larger buy moves the selected side&apos;s quantity and raises its marginal price relative to the opposing side. a sell moves it in the opposite direction.</p><dl className="docsDefinitions"><div><dt>price</dt><dd>the live marginal curve price displayed for one side token.</dd></div><div><dt>control</dt><dd>the relative quantity of side a versus side b, expressed as a percentage.</dd></div><div><dt>liquidity</dt><dd>test usdc recorded as curve reserve and available to support valid exits.</dd></div><div><dt>slippage</dt><dd>the difference tolerated between the previewed output and the confirmed transaction output.</dd></div></dl></section>

          <section id="fees"><header><span>%</span><h2>fees</h2></header><p>all fee figures below are the current onchain market version 1 configuration. governance can version future fee splits; already accrued claimable balances are not repriced.</p><div className="docsFeeTable"><div className="docsFeeHead"><span>item</span><span>rate</span><span>how it works</span></div>{feeRows.map((row) => <div key={row.label}><strong>{row.label}</strong><b>{row.value}</b><span>{row.note}</span></div>)}</div><div className="docsCallout"><strong>example</strong><p>a 100 test usdc buy has a 1 test usdc trading fee. under fee split version 1, 0.70 goes to protocol, 0.20 to the creator and 0.10 to the bound referrer. without a referrer, protocol receives 0.80.</p></div></section>

          <section id="crown"><header><span><CrownIcon /></span><h2>crown rules</h2></header><ol className="docsTimeline"><li><strong>activation</strong><span>the crown system activates permanently once curve reserve reaches 70,000 test usdc.</span></li><li><strong>assignment</strong><span>the first non-tied side in the activated market receives the crown.</span></li><li><strong>challenge</strong><span>the opposing side opens a challenge at 48% control.</span></li><li><strong>takeover</strong><span>the challenger must maintain at least 52% control continuously for 60 seconds.</span></li><li><strong>defense</strong><span>the crowned side defends at 55%; a failed challenger may need to fall below 45% before challenging again.</span></li></ol><p>an elapsed, valid crown hold can be finalized permissionlessly even without another trade.</p></section>

          <section id="referrals"><header><span>◎</span><h2>referrals and earnings</h2></header><p>a valid referral address is bound on a trader&apos;s first referred buy for that market. the trader cannot refer themselves and cannot replace an existing bound referrer. creator and referral shares accrue in the fee vault and can be claimed from portfolio earnings.</p></section>

          <section id="launch"><header><span>+</span><h2>launching a contest</h2></header><p>a creator supplies a title, category, two distinct side names and token symbols. description, reference link and side logos provide context. metadata is prepared before the factory transaction and its hash is stored with the immutable contest record.</p><ul><li>one contest always has two erc-20 side tokens.</li><li>creation costs 5 test usdc in the current testnet deployment.</li><li>an optional initial position can start the market after creation.</li><li>uploaded logos accept png, jpeg or webp up to 2 mb.</li></ul></section>

          <section id="comments"><header><span>“</span><h2>comments and indexed data</h2></header><p>live commentary contains wallet-authenticated user comments and replies. comments are signed by the wallet and stored by the application service; they are not written to the blockchain. trades, flips, fee accruals and crown transitions come from confirmed indexed contract events.</p></section>

          <section id="risk"><header><span>!</span><h2>risk modes and user safety</h2></header><div className="docsRuleGrid"><div><strong>normal</strong><p>buy, sell and flip are available subject to balances, quotes and allowances.</p></div><div><strong>risk-off</strong><p>new buys and flips stop while valid sells remain available.</p></div><div><strong>full pause</strong><p>all trading stops. already earned fee claims and non-fund crown finalization remain separately controlled.</p></div></div><div className="docsWarning"><strong>testnet notice</strong><p>test eth, test usdc and side tokens have no monetary value. smart contracts are not represented as audited for mainnet use. quotes can move, transactions can fail and returns are never guaranteed.</p></div></section>

          <section id="contracts"><header><span>◇</span><h2>testnet contracts</h2></header><div className="docsContracts">{Object.entries(contracts).map(([name, address]) => <a href={`${explorer}/${address}`} key={name} rel="noreferrer" target="_blank"><span>{name.replace(/([A-Z])/g, " $1").toLowerCase()}</span><code>{address}</code><b>↗</b></a>)}</div><p>network: robinhood chain testnet · chain id 46630 · settlement decimals: 6.</p></section>
        </article>
      </div>
    </main>
    <ExploreFooter />
  </>;
}
