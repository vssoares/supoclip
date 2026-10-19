export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];
// Portuguese by default; self-hosters and the e2e suite can override it at build/start time.
export const DEFAULT_LOCALE: Locale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "en" ? "en" : "pt";
export const LOCALE_COOKIE = "supoclip-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
