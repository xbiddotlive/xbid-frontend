"use client";

import { darkTheme, lightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useCallback, useSyncExternalStore } from "react";
import { WagmiProvider } from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { wagmiConfig } from "@/lib/blockchain/config";
import { LocaleContext } from "@/lib/i18n/locale-context";
import { message, type Locale } from "@/lib/i18n/messages";
import { ThemeContext, type ThemeMode } from "@/lib/theme/theme-context";
import { WebVitals } from "./web-vitals";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 4_000,
    },
  },
});

const themeChangeEvent = "xbid-theme-change";
const localeChangeEvent = "xbid-locale-change";

function getThemeSnapshot(): ThemeMode {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): ThemeMode {
  return "dark";
}

function subscribeToTheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  const followSystemTheme = () => {
    if (localStorage.getItem("xbid-theme")) return;
    document.documentElement.dataset.theme = media.matches ? "light" : "dark";
    onStoreChange();
  };

  window.addEventListener(themeChangeEvent, onStoreChange);
  media.addEventListener("change", followSystemTheme);
  return () => {
    window.removeEventListener(themeChangeEvent, onStoreChange);
    media.removeEventListener("change", followSystemTheme);
  };
}

function getLocaleSnapshot(): Locale {
  return document.documentElement.dataset.locale === "zh" ? "zh" : "en";
}

function subscribeToLocale(onStoreChange: () => void) {
  const syncStoredLocale = (event: StorageEvent) => {
    if (event.key !== "xbid-locale") return;
    const nextLocale = event.newValue === "zh" ? "zh" : "en";
    document.documentElement.dataset.locale = nextLocale;
    document.documentElement.lang = nextLocale === "zh" ? "zh-CN" : "en";
    onStoreChange();
  };
  window.addEventListener(localeChangeEvent, onStoreChange);
  window.addEventListener("storage", syncStoredLocale);
  return () => {
    window.removeEventListener(localeChangeEvent, onStoreChange);
    window.removeEventListener("storage", syncStoredLocale);
  };
}

export function AppProviders({ children, initialLocale = "en" }: PropsWithChildren<{ initialLocale?: Locale }>) {
  const themeMode = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const locale = useSyncExternalStore(subscribeToLocale, getLocaleSnapshot, () => initialLocale);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem("xbid-theme", mode);
    window.dispatchEvent(new Event(themeChangeEvent));
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    document.documentElement.dataset.locale = nextLocale;
    document.documentElement.lang = nextLocale === "zh" ? "zh-CN" : "en";
    localStorage.setItem("xbid-locale", nextLocale);
    document.cookie = `xbid-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event(localeChangeEvent));
  }, []);

  const translate = useCallback(
    (key: Parameters<typeof message>[1], values?: Parameters<typeof message>[2]) => message(locale, key, values),
    [locale],
  );

  const walletTheme = themeMode === "light"
    ? lightTheme({
        accentColor: "#ff603d",
        accentColorForeground: "#ffffff",
        borderRadius: "small",
        fontStack: "system",
        overlayBlur: "small",
      })
    : darkTheme({
        accentColor: "#ff603d",
        accentColorForeground: "#ffffff",
        borderRadius: "small",
        fontStack: "system",
        overlayBlur: "small",
      });

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={robinhoodTestnet}
          locale={locale === "zh" ? "zh-CN" : "en-US"}
          modalSize="compact"
          showRecentTransactions={false}
          theme={walletTheme}
        >
          <LocaleContext.Provider value={{ locale, setLocale, t: translate }}>
            <ThemeContext.Provider value={{ mode: themeMode, setMode: setThemeMode }}>
              <WebVitals />
              {children}
            </ThemeContext.Provider>
          </LocaleContext.Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
