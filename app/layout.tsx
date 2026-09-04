import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { GlobalHeader } from "@/components/navigation/global-header";
import { AppProviders } from "@/components/providers/app-providers";
import { JsonLd } from "@/components/seo/json-ld";
import {
  applicationSchema,
  companyName,
  organizationSchema,
  siteDescription,
  siteName,
  siteUrl,
  websiteSchema,
} from "@/lib/seo/site";

import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "xbid.live — live onchain contest markets",
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "onchain contest market",
    "live market",
    "crypto trading game",
    "two-sided market",
    "Robinhood Chain Testnet",
    "XBID",
  ],
  authors: [{ name: companyName }],
  creator: companyName,
  publisher: companyName,
  category: "finance",
  referrer: "origin-when-cross-origin",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "xbid.live — live onchain contest markets",
    description: siteDescription,
    siteName,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "xbid.live — live onchain contest markets",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { address: false, email: false, telephone: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const localeCookie = (await cookies()).get("xbid-locale")?.value;
  const initialLocale = localeCookie === "zh" ? "zh" : "en";
  return (
    <html data-locale={initialLocale} data-scroll-behavior="smooth" lang={initialLocale === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var saved=localStorage.getItem("xbid-theme");var mode=saved==="dark"||saved==="light"?saved:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=mode}catch(e){document.documentElement.dataset.theme="dark"}try{var locale=localStorage.getItem("xbid-locale");locale=locale==="zh"||locale==="en"?locale:(navigator.language||"").toLowerCase().startsWith("zh")?"zh":"en";document.documentElement.dataset.locale=locale;document.documentElement.lang=locale==="zh"?"zh-CN":"en"}catch(e){document.documentElement.dataset.locale="en"}})();` }} />
      </head>
      <body>
        <JsonLd data={[organizationSchema, websiteSchema, applicationSchema]} />
        <AppProviders initialLocale={initialLocale}>
          <GlobalHeader />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
