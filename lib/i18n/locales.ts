// Language names remain in their own language so the switcher is always usable.
export const locales = [
  { code: "en", name: "English", htmlLang: "en", wallet: "en-US" },
  { code: "zh", name: "中文", htmlLang: "zh-CN", wallet: "zh-CN" },
  { code: "bn", name: "বাংলা", htmlLang: "bn", wallet: "en-US" },
  { code: "de", name: "Deutsch", htmlLang: "de", wallet: "de-DE" },
  { code: "es", name: "Español", htmlLang: "es", wallet: "es-419" },
  { code: "fr", name: "Français", htmlLang: "fr", wallet: "fr-FR" },
  { code: "hi", name: "हिन्दी", htmlLang: "hi", wallet: "hi-IN" },
  { code: "id", name: "Bahasa Indonesia", htmlLang: "id", wallet: "id-ID" },
  { code: "it", name: "Italiano", htmlLang: "it", wallet: "en-US" },
  { code: "ja", name: "日本語", htmlLang: "ja", wallet: "ja-JP" },
  { code: "pl", name: "Polski", htmlLang: "pl", wallet: "en-US" },
  { code: "pt", name: "Português", htmlLang: "pt", wallet: "pt-BR" },
  { code: "ru", name: "Русский", htmlLang: "ru", wallet: "ru-RU" },
  { code: "th", name: "ไทย", htmlLang: "th", wallet: "th-TH" },
  { code: "tl", name: "Tagalog", htmlLang: "fil", wallet: "en-US" },
  { code: "uk", name: "Українська", htmlLang: "uk", wallet: "uk-UA" },
] as const;

export type Locale = (typeof locales)[number]["code"];

export function isLocale(value: unknown): value is Locale {
  return locales.some((entry) => entry.code === value);
}

export function matchLocale(value: string | null | undefined): Locale | undefined {
  const language = value?.trim().toLowerCase().replaceAll("_", "-").split("-")[0];
  if (language === "fil") return "tl";
  return isLocale(language) ? language : undefined;
}

export function resolveLocale(preferences: readonly string[]): Locale {
  for (const language of preferences) {
    const match = matchLocale(language);
    if (match) return match;
  }
  return "en";
}

export function acceptLanguageLocale(header: string | null): Locale {
  const preferences = (header ?? "").split(",").map((entry) => {
    const [tag, ...parameters] = entry.trim().split(";");
    const quality = parameters.find((part) => part.trim().startsWith("q="));
    return { tag, quality: quality ? Number(quality.trim().slice(2)) : 1 };
  }).filter((entry) => entry.quality > 0 && entry.quality <= 1)
    .sort((a, b) => b.quality - a.quality);
  return resolveLocale(preferences.map((entry) => entry.tag));
}

export function localeInfo(locale: Locale) {
  return locales.find((entry) => entry.code === locale)!;
}
