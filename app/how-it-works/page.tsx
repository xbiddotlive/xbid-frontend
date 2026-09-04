import Link from "next/link";

import { ExploreFooter } from "@/components/navigation/explore-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon, CrownIcon, InfoIcon } from "@/components/ui/icons";
import { I18nText } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
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
          <p className="eyebrow"><span className="livePulse" /><I18nText id="how.eyebrow" /></p>
          <h1><I18nText id="how.title" /></h1>
          <p><I18nText id="how.description" /></p>
          <div className="educationHeroActions"><Link className="button buttonPrimary" href="/"><I18nText id="how.explore" /> <ArrowIcon /></Link><Link className="button buttonQuiet" href="/docs"><I18nText id="how.rules" /></Link></div>
        </div>
        <div aria-labelledby="example-market-label" className="educationArena">
          <span className="visuallyHidden" id="example-market-label"><I18nText id="how.example" /></span>
          <div data-side="a"><span><I18nText id="common.sideA" /></span><strong>56%</strong><small>$0.542 · +12.8% · 24h</small></div>
          <span className="educationVersus"><i /><I18nText id="common.live" /></span>
          <div data-side="b"><span><I18nText id="common.sideB" /></span><strong>44%</strong><small>$0.418 · -6.2% · 24h</small></div>
          <span className="educationControl"><i /><b /><I18nText id="how.controlMoves" /></span>
        </div>
      </section>

      <section className="educationSection" aria-labelledby="four-moves">
        <header><span><InfoIcon /></span><div><p className="eyebrow"><I18nText id="how.stepsEyebrow" /></p><h2 id="four-moves"><I18nText id="how.stepsTitle" /></h2></div></header>
        <div className="educationSteps">{howSteps.map((step, index) => <article key={step.index}><span>{step.index}</span><h3><I18nText id={`how.step.${index + 1}.title` as MessageKey} /></h3><p><I18nText id={`how.step.${index + 1}.description` as MessageKey} /></p></article>)}</div>
      </section>

      <section className="educationSection" aria-labelledby="trade-actions">
        <header><span><ArrowIcon /></span><div><p className="eyebrow"><I18nText id="how.actionsEyebrow" /></p><h2 id="trade-actions"><I18nText id="how.actionsTitle" /></h2></div></header>
        <div className="educationActionGrid">{tradeActions.map((item) => <article data-tone={item.tone} key={item.action}><span><I18nText id={`trade.${item.action}` as MessageKey} /></span><strong><I18nText id={`how.action.${item.action}.summary` as MessageKey} /></strong><p><I18nText id={`how.action.${item.action}.description` as MessageKey} /></p></article>)}</div>
      </section>

      <section className="educationSection crownExplainer" aria-labelledby="crown-rules">
        <header><span><CrownIcon /></span><div><p className="eyebrow"><I18nText id="how.crownEyebrow" /></p><h2 id="crown-rules"><I18nText id="how.crownTitle" /></h2></div></header>
        <div className="crownSequence">
          <div><span><I18nText id="how.activate" /></span><strong><I18nText id="how.activateValue" /></strong><p><I18nText id="how.activateDescription" /></p></div>
          <i aria-hidden="true" />
          <div><span><I18nText id="how.challenge" /></span><strong><I18nText id="how.challengeValue" /></strong><p><I18nText id="how.challengeDescription" /></p></div>
          <i aria-hidden="true" />
          <div><span><I18nText id="how.takeover" /></span><strong><I18nText id="how.takeoverValue" /></strong><p><I18nText id="how.takeoverDescription" /></p></div>
        </div>
      </section>

      <section className="educationSection educationFaq" aria-labelledby="common-questions">
        <header><span>?</span><div><p className="eyebrow"><I18nText id="how.faqEyebrow" /></p><h2 id="common-questions"><I18nText id="how.faqTitle" /></h2></div></header>
        <div>{frequentlyAskedQuestions.map((item, index) => <details key={item.question}><summary><I18nText id={`how.faq.${index + 1}.question` as MessageKey} /></summary><p><I18nText id={`how.faq.${index + 1}.answer` as MessageKey} /></p></details>)}</div>
      </section>

      <section className="educationCta"><div><p className="eyebrow"><I18nText id="how.ready" /></p><h2><I18nText id="how.readyTitle" /></h2></div><Link className="button buttonPrimary" href="/"><I18nText id="how.openArena" /> <ArrowIcon /></Link></section>
    </main>
    <ExploreFooter />
  </>;
}
