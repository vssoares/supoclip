"use client";

import Image from "next/image";
import Link from "next/link";

import { getMarketingLinks } from "@/lib/marketing-links";
import { APP_STORE_URL, GITHUB_URL } from "@/lib/site";
import { useT } from "@/lib/i18n";

const linkClassName = "hover:text-foreground transition-colors";

/** Crawlable footer shared by the landing page, SEO pages, and blog. */
export function SiteFooter() {
  const t = useT();
  const columns = [
    { heading: t("foot.guides"), links: getMarketingLinks("guide").map(({ href, label }) => ({ href, label })) },
    {
      heading: t("foot.compare"),
      links: [...getMarketingLinks("comparison").map(({ href, label }) => ({ href, label })), { href: "/blog", label: t("foot.allArticles") }],
    },
    {
      heading: t("foot.product"),
      links: [
        ...getMarketingLinks("product").map(({ href, label }) => ({ href, label })),
        { href: "/sign-up", label: t("foot.start") },
        { href: "/#pricing", label: t("foot.pricing") },
        { href: "/affiliate", label: t("foot.affiliate") },
        { href: "/status", label: t("foot.status") },
        { href: "/privacy", label: t("foot.privacy") },
        { href: "/terms", label: t("foot.terms") },
      ],
    },
  ];

  return (
    <footer className="border-t px-6 py-12">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SupoClip" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne), system-ui" }}>
              SupoClip
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-xs leading-6 text-muted-foreground">
            {t("foot.tagline")}
          </p>
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={linkClassName}>GitHub</a>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={linkClassName}>{t("foot.ios")}</a>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
        {columns.map((column) => (
          <nav key={column.heading} aria-label={t("foot.links", { heading: column.heading })}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">{column.heading}</p>
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClassName}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
