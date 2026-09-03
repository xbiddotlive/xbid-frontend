"use client";

import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { wagmiConfig } from "@/lib/blockchain/config";
import { WebVitals } from "./web-vitals";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 4_000,
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={robinhoodTestnet}
          locale="en-US"
          modalSize="compact"
          showRecentTransactions={false}
          theme={darkTheme({
            accentColor: "#ff603d",
            accentColorForeground: "#ffffff",
            borderRadius: "small",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          <WebVitals />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
