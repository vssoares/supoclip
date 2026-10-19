import { en, type MessageKey } from "./en";
import { pt } from "./pt";
import type { Locale } from "./config";

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, pt };

/** Plain (non-hook) translator for server code and module-level helpers. */
export function makeTranslator(locale: Locale): Translate {
  return (key, vars) => {
    const template = DICTIONARIES[locale][key] ?? en[key];
    return vars ? template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`)) : template;
  };
}
