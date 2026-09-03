import Link from "next/link";

import { ExploreFooter } from "@/components/navigation/explore-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon, CrownIcon, InfoIcon } from "@/components/ui/icons";
import { frequentlyAskedQuestions, howSteps, tradeActions } from "@/lib/product/education";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "how it works",
  description: "Learn how to choose a side, buy, sell, flip and compete for the crown on xbid.live.",
  path: "/how-it-works",
});

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: frequentlyAskedQuestions.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function HowItWorksPage() {
  return <>
    <JsonLd data={faqSchema} />
    <main className="pageShell educationPage">
      <section className="educationHero">
        <div>
          <p className="eyebrow"><span className="livePulse" />learn the arena</p>
          <h1>back a side. move the market. take the crown.</h1>
          <p>xbid turns a two-sided idea into a live onchain contest. every trade changes the price, the balance of control and the story unfolding in public.</p>
          <div className="educationHeroActions"><Link className="button buttonPrimary" href="/">explore live contests <ArrowIcon /></Link><Link className="button buttonQuiet" href="/docs">read the rules</Link></div>
        </div>
        <div aria-label="example two-sided live market" className="educationArena">
          <div data-side="a"><span>side a</span><strong>56%</strong><small>$0.542 · +12.8% · 24h</small></div>
          <span className="educationVersus"><i />live</span>
          <div data-side="b"><span>side b</span><strong>44%</strong><small>$0.418 · -6.2% · 24h</small></div>
          <span className="educationControl"><i /><b />live control moves with every confirmed trade</span>
        </div>
      </section>

      <section className="educationSection" aria-labelledby="four-moves">
        <header><span><InfoIcon /></span><div><p className="eyebrow">from wallet to live position</p><h2 id="four-moves">four simple moves</h2></div></header>
        <div className="educationSteps">{howSteps.map((step) => <article key={step.index}><span>{step.index}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
      </section>

      <section className="educationSection" aria-labelledby="trade-actions">
        <header><span><ArrowIcon /></span><div><p className="eyebrow">one position, three actions</p><h2 id="trade-actions">trade without leaving the arena</h2></div></header>
        <div className="educationActionGrid">{tradeActions.map((item) => <article data-tone={item.tone} key={item.action}><span>{item.action}</span><strong>{item.summary}</strong><p>{item.description}</p></article>)}</div>
      </section>

      <section className="educationSection crownExplainer" aria-labelledby="crown-rules">
        <header><span><CrownIcon /></span><div><p className="eyebrow">sustained control, not one lucky click</p><h2 id="crown-rules">how the crown changes hands</h2></div></header>
        <div className="crownSequence">
          <div><span>activate</span><strong>70,000 test usdc reserve</strong><p>the crown competition starts once the curve reserve reaches the activation level.</p></div>
          <i aria-hidden="true" />
          <div><span>challenge</span><strong>48% control</strong><p>the non-crowned side can open a live challenge when it reaches this boundary.</p></div>
          <i aria-hidden="true" />
          <div><span>takeover</span><strong>52% for 60 seconds</strong><p>the challenger must keep control above the takeover level for the full hold period.</p></div>
        </div>
      </section>

      <section className="educationSection educationFaq" aria-labelledby="common-questions">
        <header><span>?</span><div><p className="eyebrow">clear answers before you trade</p><h2 id="common-questions">common questions</h2></div></header>
        <div>{frequentlyAskedQuestions.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer.toLowerCase()}</p></details>)}</div>
      </section>

      <section className="educationCta"><div><p className="eyebrow">ready to enter?</p><h2>choose a live contest and make your move.</h2></div><Link className="button buttonPrimary" href="/">open the arena <ArrowIcon /></Link></section>
    </main>
    <ExploreFooter />
  </>;
}
