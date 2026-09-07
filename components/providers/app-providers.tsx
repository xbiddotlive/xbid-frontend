"use client";

import { darkTheme, lightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WagmiProvider } from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { wagmiConfig } from "@/lib/blockchain/config";
import { LocaleContext } from "@/lib/i18n/locale-context";
import type { Dictionary, Locale } from "@/lib/i18n/messages";
import { message } from "@/lib/i18n/format-message";
import { loadDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, localeInfo, resolveLocale } from "@/lib/i18n/locales";
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

export function AppProviders({ children, initialLocale, initialDictionary }: PropsWithChildren<{ initialLocale: Locale; initialDictionary: Dictionary }>) {
  const themeMode = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const [{ locale, dictionary }, setLanguage] = useState({ locale: initialLocale, dictionary: initialDictionary });
  const [localeLoading, setLocaleLoading] = useState(false);
  const [localeError, setLocaleError] = useState(false);
  const localeRequest = useRef(0);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem("xbid-theme", mode);
    window.dispatchEvent(new Event(themeChangeEvent));
  }, []);

  const setLocale = useCallback(async (nextLocale: Locale) => {
    if (!isLocale(nextLocale)) return;
    const request = ++localeRequest.current;
    setLocaleLoading(true);
    setLocaleError(false);
    try {
      const nextDictionary = await loadDictionary(nextLocale);
      if (request !== localeRequest.current) return;
      setLanguage({ locale: nextLocale, dictionary: nextDictionary });
      document.documentElement.dataset.locale = nextLocale;
      document.documentElement.lang = localeInfo(nextLocale).htmlLang;
      // Private browsing or blocked storage must not prevent a language switch.
      try { localStorage.setItem("xbid-locale", nextLocale); } catch {}
      try { document.cookie = `xbid-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`; } catch {}
    } catch {
      if (request === localeRequest.current) setLocaleError(true);
    } finally {
      if (request === localeRequest.current) setLocaleLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const requestCounter = localeRequest;
    // Cookies win on SSR. Recover legacy localStorage preferences only if absent.
    const hasCookie = document.cookie.split(";").some((value) => {
      const [name, stored] = value.trim().split("=");
      return name === "xbid-locale" && isLocale(stored);
    });
    if (!hasCookie) {
      try {
        const stored = localStorage.getItem("xbid-locale");
        if (isLocale(stored) && stored !== initialLocale) {
          // Restore browser-only preferences after hydration has committed.
          queueMicrotask(() => { if (active) void setLocale(stored); });
        }
      } catch {}
    }
    const syncStoredLocale = (event: StorageEvent) => {
      if (event.key !== "xbid-locale" && event.key !== null) return;
      const nextLocale = isLocale(event.newValue) ? event.newValue : resolveLocale(navigator.languages);
      void setLocale(nextLocale);
    };
    window.addEventListener("storage", syncStoredLocale);
    return () => {
      active = false;
      ++requestCounter.current;
      window.removeEventListener("storage", syncStoredLocale);
    };
  }, [initialLocale, setLocale]);

  const translate = useCallback(
    (key: Parameters<typeof message>[1], values?: Parameters<typeof message>[2]) => message(dictionary, key, values),
    [dictionary],
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
          locale={localeInfo(locale).wallet}
          modalSize="compact"
          showRecentTransactions={false}
          theme={walletTheme}
        >
          <LocaleContext.Provider value={{ locale, setLocale, localeLoading, localeError, t: translate }}>
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
