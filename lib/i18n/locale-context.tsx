"use client";

import { createContext, Fragment, useContext, type ReactNode } from "react";

import type { Locale, MessageKey, MessageValues } from "./messages";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  localeLoading: boolean;
  localeError: boolean;
  t: (key: MessageKey, values?: MessageValues) => string;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useI18n() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("locale context is unavailable");
  return value;
}

export function I18nText({ id, values }: { id: MessageKey; values?: MessageValues }): ReactNode {
  const { t } = useI18n();
  return <Fragment>{t(id, values)}</Fragment>;
}
