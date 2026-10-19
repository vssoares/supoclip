"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_UI_FONT, UI_FONTS, UI_FONT_COOKIE, UI_FONT_LABELS, isUiFont, type UiFont } from "@/lib/ui-font";
import { cn } from "@/lib/utils";

const FONT_VARS: Record<UiFont, string> = {
  manrope: "var(--font-manrope)",
  geist: "var(--font-geist-sans)",
};

/** Lets the user pick the interface font. Applies instantly and persists in a cookie. */
export function UiFontSelect({ className }: { className?: string }) {
  const router = useRouter();
  const [font, setFont] = useState<UiFont>(DEFAULT_UI_FONT);

  // The server sets data-ui-font on <body> from the cookie; read it after mount to avoid a hydration mismatch.
  useEffect(() => {
    const current = document.body.dataset.uiFont;
    if (isUiFont(current)) setFont(current);
  }, []);

  const change = (value: UiFont) => {
    if (value === font) return;
    setFont(value);
    document.body.dataset.uiFont = value;
    document.cookie = `${UI_FONT_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {UI_FONTS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => change(option)}
          aria-pressed={font === option}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors hover:border-foreground/30",
            font === option && "border-foreground ring-1 ring-foreground",
          )}
          style={{ fontFamily: `${FONT_VARS[option]}, system-ui, sans-serif` }}
        >
          <span className="block text-sm font-semibold">{UI_FONT_LABELS[option]}</span>
          <span className="mt-1 block text-2xl tracking-tight">Aa Bb 123</span>
        </button>
      ))}
    </div>
  );
}
