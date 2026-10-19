"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, isLocale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();

  const change = (value: string) => {
    if (!isLocale(value) || value === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <label className={cn("relative inline-flex items-center text-muted-foreground", className)}>
      <Languages className="pointer-events-none absolute left-2 size-4" />
      <select
        value={locale}
        onChange={(event) => change(event.target.value)}
        aria-label={t("language.label")}
        className="h-8 appearance-none rounded-md border border-sidebar-border bg-background pl-8 pr-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>{LOCALE_LABELS[code]}</option>
        ))}
      </select>
    </label>
  );
}
