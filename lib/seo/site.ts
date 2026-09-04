import type { Metadata } from "next";

export const siteName = "xbid.live";
export const companyName = "WEconomy Labs";
export const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
export const siteDescription = "A live onchain contest market where two sides compete for capital, control and the crown.";

export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title: `${title} | ${siteName}`,
      description,
      siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteName}`,
      description,
    },
  };
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: companyName,
  url: siteUrl,
  logo: `${siteUrl}/icon.svg`,
  sameAs: [
    process.env.NEXT_PUBLIC_X_URL ?? "https://x.com/xbid_live",
    process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/xnD5vcPU9B",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  alternateName: "XBID",
  url: siteUrl,
  description: siteDescription,
  publisher: { "@type": "Organization", name: companyName },
};

export const applicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires a modern browser and an EVM-compatible wallet for trading.",
  featureList: [
    "Two-sided onchain contest markets",
    "Live buy, sell and atomic flip trading",
    "Onchain crown competition",
    "Creator and referral rewards",
  ],
};
