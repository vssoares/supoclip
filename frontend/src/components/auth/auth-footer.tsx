"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/en";

const MODES: Record<"sign-in" | "sign-up" | "forgot" | "reset", { text: MessageKey; link: MessageKey; href: string }> = {
  "sign-in": { text: "auth.signIn.footer", link: "auth.signIn.footerLink", href: "/sign-up" },
  "sign-up": { text: "auth.signUp.footer", link: "auth.signUp.footerLink", href: "/sign-in" },
  forgot: { text: "forgot.footer", link: "forgot.footerLink", href: "/sign-in" },
  reset: { text: "reset.footer", link: "forgot.footerLink", href: "/sign-in" },
};

export function AuthFooter({ mode }: { mode: keyof typeof MODES }) {
  const t = useT();
  const { text, link, href } = MODES[mode];
  return (
    <>
      {t(text)}{" "}
      <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
        {t(link)}
      </Link>
    </>
  );
}
