"use client";

import { useState } from "react";
import Link from "next/link";

import { DiscordIcon, GlobeIcon, XIcon } from "@/components/ui/icons";

type FooterLanguage = "en" | "zh";
const brandName = "WEconomy Labs";

const copy = {
  en: {
    companyLine: "the live onchain contest market",
    language: "Footer language",
    optionLabel: "English",
    risk: "XBID is currently operating on testnet. Market prices move with trading activity; returns are never guaranteed.",
  },
  zh: {
    companyLine: "实时链上对阵市场",
    language: "底部语言",
    optionLabel: "中文",
    risk: "XBID 目前运行于测试网。市场价格会随交易活动变化，任何收益均不作保证。",
  },
} as const;

const xUrl = process.env.NEXT_PUBLIC_X_URL ?? "https://x.com";
const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.com";

export function ExploreFooter() {
  const [language, setLanguage] = useState<FooterLanguage>("en");
  const text = copy[language];

  return (
    <footer className="exploreFooter">
      <div className="exploreFooterInner">
        <div className="exploreFooterMain">
          <nav aria-label={`${brandName} social links`} className="exploreSocials">
            <a aria-label={`${brandName} on X`} href={xUrl} rel="noreferrer" target="_blank"><XIcon /></a>
            <a aria-label={`${brandName} on Discord`} href={discordUrl} rel="noreferrer" target="_blank"><DiscordIcon /></a>
          </nav>

          <div className="exploreFooterBrand">
            <div><strong>{brandName} © 2026</strong><span>{text.companyLine}</span></div>
            <nav aria-label="product information"><Link href="/how-it-works">how it works</Link><Link href="/docs">docs</Link></nav>
          </div>

          <label className="exploreLanguage">
            <GlobeIcon />
            <span className="visuallyHidden">{text.language}</span>
            <select aria-label={text.language} onChange={(event) => setLanguage(event.target.value as FooterLanguage)} value={language}>
              <option value="en">{copy.en.optionLabel}</option>
              <option value="zh">{copy.zh.optionLabel}</option>
            </select>
          </label>
        </div>
        <p>{text.risk}</p>
      </div>
    </footer>
  );
}
