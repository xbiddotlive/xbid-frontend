import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <JsonLd data={[organizationSchema, websiteSchema, applicationSchema]} />
        <AppProviders>
          <GlobalHeader />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
