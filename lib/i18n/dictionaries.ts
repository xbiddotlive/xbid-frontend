import type { Dictionary } from "./messages";
import type { Locale } from "./locales";
import { activeChain } from "../blockchain/chain";

// Static import paths let Next split language packs; never put all 16 in the entry bundle.
const loaders = {
  en: () => import("./messages").then((module) => module.en),
  zh: () => import("./messages").then((module) => module.zh),
  bn: () => import("./translations/bn.json").then((module) => module.default),
  de: () => import("./translations/de.json").then((module) => module.default),
  es: () => import("./translations/es.json").then((module) => module.default),
  fr: () => import("./translations/fr.json").then((module) => module.default),
  hi: () => import("./translations/hi.json").then((module) => module.default),
  id: () => import("./translations/id.json").then((module) => module.default),
  it: () => import("./translations/it.json").then((module) => module.default),
  ja: () => import("./translations/ja.json").then((module) => module.default),
  pl: () => import("./translations/pl.json").then((module) => module.default),
  pt: () => import("./translations/pt.json").then((module) => module.default),
  ru: () => import("./translations/ru.json").then((module) => module.default),
  th: () => import("./translations/th.json").then((module) => module.default),
  tl: () => import("./translations/tl.json").then((module) => module.default),
  uk: () => import("./translations/uk.json").then((module) => module.default),
} satisfies Record<Locale, () => Promise<Dictionary>>;

export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  const dictionary = await loaders[locale]();
  if (activeChain.testnet) return dictionary;
  const { mainnetDictionary } = await import("./mainnet-copy");
  return mainnetDictionary(dictionary, locale, activeChain.nativeCurrency.symbol);
}
