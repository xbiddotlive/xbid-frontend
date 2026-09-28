import { activeChain } from "../blockchain/chain";

export const howSteps = [
  { index: "01", title: "connect", description: "connect an evm wallet and switch to robinhood chain testnet." },
  { index: "02", title: "choose a side", description: "read the live price, dominance, liquidity and recent trades before taking a position." },
  { index: "03", title: "make your move", description: "buy a side token, sell an existing position, or flip directly to the opposing side." },
  { index: "04", title: "join the debate", description: "a confirmed 1 test usdc buy unlocks trader-only comments and replies for that contest." },
] as const;

export const tradeActions = [
  { action: "buy", tone: "a", summary: "back a side", description: "pay test usdc and receive that side's position token at the current curve price." },
  { action: "sell", tone: "neutral", summary: "reduce or exit", description: "burn a side token and receive the quoted test usdc output after the trading fee." },
  { action: "flip", tone: "b", summary: "switch conviction", description: "burn one side and mint the other atomically in a single transaction with one trading fee." },
] as const;

export const feeRows = [
  { label: "trading fee", value: "1%", note: "applies to buy, sell and flip; rounded up to the smallest test usdc unit" },
  { label: "protocol share", value: activeChain.testnet ? "70%" : "50%", note: "share of the trading fee under fee split version 1" },
  { label: "creator share", value: activeChain.testnet ? "20%" : "40%", note: "claimable by the contest creator" },
  { label: "referrer share", value: "10%", note: "claimable by the wallet's bound referrer; otherwise assigned to protocol" },
  { label: "contest creation", value: activeChain.testnet ? "5 test usdc" : "5 usdc", note: "one-time fee paid when a contest is launched" },
] as const;

const testnetFrequentlyAskedQuestions = [
  {
    question: "what is xbid?",
    answer: "XBID is a live two-sided onchain contest market. Traders back one side, exit, or flip sides while confirmed trades continuously move price and control.",
  },
  {
    question: "is xbid a prediction market?",
    answer: "Not in the traditional binary-settlement sense. XBID does not wait for an external event result to pay a winning side. Position value changes on a continuous market curve and users realize value by selling or flipping.",
  },
  {
    question: "how do traders make or lose money?",
    answer: "A trader receives side tokens at the current curve quote. If later demand improves the exit quote, selling may return more Test USDC; if demand moves against the position, the exit quote may be lower. Fees and slippage also affect returns.",
  },
  {
    question: "what does control mean?",
    answer: "Control is the curve-weighted dominance of the two sides, excluding neutral liquidity. Both sides total 100%; it shows which side currently leads and powers the crown competition.",
  },
  {
    question: "how does the crown move?",
    answer: "After crown activation, a challenger can open a challenge at 48% control. It must reach at least 52% and hold that level continuously for 60 seconds to take the crown.",
  },
  {
    question: "who can comment?",
    answer: "A connected wallet can comment or reply after completing at least 1 Test USDC of confirmed buys in that contest. One wallet session signature authorizes app writes; comments are limited to one every 30 seconds and 20 per contest each UTC day.",
  },
  {
    question: "are funds and returns guaranteed?",
    answer: "No. XBID is currently a Testnet application. Tokens have no monetary value, returns are not guaranteed, and users should account for contract, liquidity, market and wallet risk.",
  },
] as const;

export const frequentlyAskedQuestions = testnetFrequentlyAskedQuestions.map((item, index) => activeChain.testnet ? item : ({
  ...item,
  answer: index === 6
    ? "No. Mainnet uses real USDC and funds can be lost. Deployment is not an independent audit. Contract, liquidity, market and wallet risks remain; returns are never guaranteed."
    : item.answer.replace(/Test USDC/g, "USDC"),
}));
