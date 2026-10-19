"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { timeAgo } from "@/lib/generations";
import type { Locale } from "./config";
import { makeTranslator, type Translate } from "./translate";

export type { Translate };

// Without a provider (unit tests, isolated renders) fall back to English.
const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => makeTranslator(locale), [locale]);
}

export function useTimeAgo() {
  const locale = useLocale();
  const t = useT();
  return useCallback((value: string) => timeAgo(value, locale, t("time.justNow")), [locale, t]);
}
