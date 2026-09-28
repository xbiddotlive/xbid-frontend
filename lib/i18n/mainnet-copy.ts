import { en, zh, type Dictionary, type MessageKey } from "./messages";

// Only product-authored dictionary entries are adapted. Never alter contest text.
// Other locales use reviewed English for network-sensitive copy until translated.
export function mainnetDictionary(dictionary: Dictionary, locale: string, gasSymbol: string): Dictionary {
  const source = locale === "zh" ? zh : en;
  const result = { ...dictionary };
  for (const key of Object.keys(en) as MessageKey[]) {
    if (/testnet|test (?:usdc|eth)/i.test(en[key])) {
      result[key] = source[key]
        .replace(/testnet/gi, "mainnet").replace(/test usdc/gi, "USDC")
        .replace(/test eth/gi, gasSymbol).replace(/测试网/g, "主网")
        .replace(/测试\s*USDC/g, "USDC").replace(/测试\s*ETH/g, gasSymbol);
    }
  }
  const risk = locale === "zh"
    ? "主网使用真实 USDC，交易可能导致资金损失。部署不等于完成独立安全审计；请考虑合约、流动性、市场和钱包风险。报价可能变化、交易可能失败，收益不作保证。"
    : "Mainnet uses real USDC and trading can result in loss of funds. Deployment is not an independent security audit. Consider contract, liquidity, market and wallet risks. Quotes can change, transactions can fail and returns are never guaranteed.";
  result["docs.testnetNoticeText"] = risk;
  result["how.faq.7.answer"] = risk;
  result["launch.status.gas"] = locale === "zh" ? `钱包需要 ${gasSymbol} 支付 Gas。` : `The wallet needs ${gasSymbol} for gas.`;
  result["docs.eyebrow"] = locale === "zh" ? "产品文档 · 默认市场版本 4" : "product documentation · default market version 4";
  result["how.activateValue"] = locale === "zh" ? "15,000 USDC 储备" : "15,000 USDC reserve";
  result["how.activateDescription"] = locale === "zh" ? "V4 竞赛的曲线储备达到 15,000 USDC 后，皇冠竞争开始。旧版本竞赛保留原有激活门槛。" : "The crown competition starts once a V4 contest's curve reserve reaches 15,000 USDC. Older contests retain their original activation thresholds.";
  result["docs.crown.activationText"] = locale === "zh" ? "V4 竞赛的曲线储备达到 15,000 USDC 后，皇冠系统永久激活。旧版本竞赛保留原有激活门槛；此规则不追溯修改旧竞赛。" : "For V4 contests, the crown system activates permanently once curve reserve reaches 15,000 USDC. Older contests retain their original activation thresholds; this change is not retroactive.";
  result["docs.feesText"] = locale === "zh" ? "当前主网交易费按平台 50%、创建者 40%、推荐人 10% 分配。治理可设置未来的费用版本；已累积收益不会重新定价。" : "The current mainnet trading fee is split 50% to protocol, 40% to creator and 10% to referrer. Governance can version future splits; accrued balances are not repriced.";
  result["docs.exampleText"] = locale === "zh" ? "买入 100 USDC 收取 1 USDC 交易费：平台 0.50、创建者 0.40、推荐人 0.10；无推荐人时平台共获得 0.60。" : "A 100 USDC buy has a 1 USDC fee: 0.50 to protocol, 0.40 to creator and 0.10 to referrer. Without a referrer, protocol receives 0.60.";
  result["docs.pricingText"] = locale === "zh" ? "每个市场使用不可变的自动化对数计分曲线。当前默认 V4 的 b=150,000；买入提高该方的边际价格，卖出则相反。" : "Each market uses an immutable automated logarithmic scoring curve. The current default V4 uses b=150,000. Buying raises a side's marginal price relative to its opponent; selling moves it in the opposite direction.";
  return result;
}
