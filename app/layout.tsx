import type { Metadata } from "next";
import type { ReactNode } from "react";

import { GlobalHeader } from "@/components/navigation/global-header";
import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "XBID — The Live Contest Market",
  description: "Back a side. Move the market. Take the crown.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <GlobalHeader />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
