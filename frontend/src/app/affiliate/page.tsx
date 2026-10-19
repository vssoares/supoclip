import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, Link2, Percent, Search, Send } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicBillingPlans } from "@/lib/billing-plans";
import { getSiteUrl } from "@/lib/site";
import { getLocale } from "@/lib/i18n/server";
import { makeTranslator, type Translate } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/en";

const APPLY_HREF = "/settings/creator-program";
const VIDEO = {
  src: "/videos/creator-program.mp4",
  poster: "/videos/creator-program-poster.jpg",
  durationSeconds: 27,
  uploadDate: "2026-10-09",
};

const title = "SupoClip Creator Program: Get Pro Free for Making Videos";
const description =
  "Make Shorts, Reels, TikToks or videos about SupoClip and get SupoClip Pro for free. Your audience gets 20% off their first 3 months with your code.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${getSiteUrl()}/affiliate` },
  openGraph: {
    title,
    description,
    url: `${getSiteUrl()}/affiliate`,
    siteName: "SupoClip",
    type: "website",
    images: [{ url: `${getSiteUrl()}${VIDEO.poster}`, width: 1920, height: 1080 }],
    videos: [{ url: `${getSiteUrl()}${VIDEO.src}`, width: 1920, height: 1080, type: "video/mp4" }],
  },
  twitter: { card: "summary_large_image", title, description },
};

const steps: { icon: typeof Send; title: MessageKey; detail: MessageKey }[] = [
  { icon: Send, title: "aff.s1.title", detail: "aff.s1.detail" },
  { icon: Search, title: "aff.s2.title", detail: "aff.s2.detail" },
  { icon: Link2, title: "aff.s3.title", detail: "aff.s3.detail" },
];

const rules: MessageKey[] = ["aff.r1", "aff.r2", "aff.r3", "aff.r4"];

function getFaqs(proPrice: string, t: Translate) {
  return [
    { question: t("aff.q1"), answer: t("aff.a1", { price: proPrice }) },
    { question: t("aff.q2"), answer: t("aff.a2") },
    { question: t("aff.q3"), answer: t("aff.a3") },
    { question: t("aff.q4"), answer: t("aff.a4") },
    { question: t("aff.q5"), answer: t("aff.a5") },
    { question: t("aff.q6"), answer: t("aff.a6") },
  ];
}

export default async function AffiliatePage() {
  const t = makeTranslator(await getLocale());
  const siteUrl = getSiteUrl();
  const pro = getPublicBillingPlans(t).find((plan) => plan.id === "pro");
  const proPrice = pro?.priceMonthly ?? "10";
  const faqs = getFaqs(proPrice, t);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "SupoClip", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Creator program", item: `${siteUrl}/affiliate` },
        ],
      },
      {
        "@type": "VideoObject",
        name: "How the SupoClip creator program works",
        description: "Apply, pick your code, and your audience gets 20% off their first 3 months. Approved creators get SupoClip Pro for free.",
        thumbnailUrl: `${siteUrl}${VIDEO.poster}`,
        contentUrl: `${siteUrl}${VIDEO.src}`,
        uploadDate: VIDEO.uploadDate,
        duration: `PT${VIDEO.durationSeconds}S`,
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="SupoClip" width={24} height={24} className="rounded-lg" />
            <span className="text-lg font-bold tracking-tight">SupoClip</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label={t("aff.nav")}>
            <Link href="/demo"><Button variant="ghost" size="sm">{t("aff.demo")}</Button></Link>
            <Link href={APPLY_HREF}><Button size="sm">{t("aff.apply")}</Button></Link>
          </nav>
        </div>
      </header>

      <section className="border-b bg-muted/35">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-20">
          <Badge variant="secondary">{t("aff.badge")}</Badge>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-syne), var(--font-geist-sans), system-ui" }}>
            {t("aff.h1")}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            {t("aff.lead")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={APPLY_HREF}><Button size="lg">{t("aff.applyNow")} <ArrowRight className="h-4 w-4" /></Button></Link>
            <span className="text-sm text-muted-foreground">{t("aff.noMin")}</span>
          </div>
          <video
            src={VIDEO.src}
            poster={VIDEO.poster}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            width={1920}
            height={1080}
            className="mt-12 aspect-video w-full rounded-2xl border bg-muted shadow-lg"
            aria-label={t("aff.videoAria")}
          />
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <section aria-labelledby="offer-heading">
          <h2 id="offer-heading" className="text-3xl font-bold tracking-tight">{t("aff.everyone")}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-6">
              <Gift className="h-5 w-5" />
              <h3 className="mt-4 text-lg font-semibold">{t("aff.you")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("aff.youBody", { price: proPrice, limit: pro ? t("aff.youLimit", { count: pro.generationLimit }) : "" })}
              </p>
            </div>
            <div className="rounded-2xl border p-6">
              <Percent className="h-5 w-5" />
              <h3 className="mt-4 text-lg font-semibold">{t("aff.audience")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("aff.audienceBody")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-3xl font-bold tracking-tight">{t("aff.how")}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title: stepTitle, detail }, index) => (
              <li key={stepTitle} className="rounded-lg border p-5">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5" />
                  <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold">{t(stepTitle)}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(detail)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16" aria-labelledby="rules-heading">
          <h2 id="rules-heading" className="text-3xl font-bold tracking-tight">{t("aff.rules")}</h2>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-base leading-7 text-muted-foreground">
            {rules.map((rule) => <li key={rule}>{t(rule)}</li>)}
          </ul>
        </section>

        <section className="mt-16" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight">{t("aff.questions")}</h2>
          <dl className="mt-8 divide-y rounded-2xl border">
            {faqs.map((faq) => (
              <div key={faq.question} className="p-5">
                <dt className="font-semibold">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-16 rounded-2xl border bg-foreground p-6 text-background md:p-8">
          <h2 className="text-2xl font-bold tracking-tight">{t("aff.already")}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-background/70">
            {t("aff.alreadyBody")}
          </p>
          <div className="mt-6">
            <Link href={APPLY_HREF}><Button variant="secondary">{t("aff.applyNow")} <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
