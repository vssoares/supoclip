"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Copy, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { appStoreRedeemUrl } from "@/lib/site";
import { useLocale, useT } from "@/lib/i18n";

const APPLY_PATH = "/settings/creator-program";

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X" },
  { value: "other", label: "Other" },
];

const AUDIENCE_SIZES = ["under-1k", "1k-10k", "10k-100k", "100k-plus"] as const;

const TERMS = ["cp.term1", "cp.term2", "cp.term3", "cp.term4"] as const;

interface Application {
  slug: string | null;
  status: "pending" | "approved" | "declined" | "revoked";
  decline_reason: string | null;
  app_store_code_added_at: string | null;
}

type SlugState = { state: "idle" | "checking" } | { state: "available" } | { state: "unavailable"; reason: string };

function CopyField({ label, value }: { label: string; value: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border bg-muted/40 px-3 py-2 text-sm">{value}</code>
        <Button size="sm" variant="outline" onClick={copy} aria-label={t("cp.copy", { label: label.toLowerCase() })}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function CreatorProgramPage() {
  const t = useT();
  const locale = useLocale();
  const { data: session, isPending } = useSession();
  const [application, setApplication] = useState<Application | null>(null);
  const [canApplyAt, setCanApplyAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [slugState, setSlugState] = useState<SlugState>({ state: "idle" });
  const [platform, setPlatform] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [promotionPlan, setPromotionPlan] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/affiliates", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(t("cp.err.load"));
        const data = await response.json();
        setApplication(data.application);
        setCanApplyAt(data.can_apply_at);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("cp.err.load")))
      .finally(() => setIsLoading(false));
  }, [session?.user?.id, t]);

  useEffect(() => {
    const value = slug.trim();
    if (!value) {
      setSlugState({ state: "idle" });
      return;
    }
    setSlugState({ state: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/affiliates/slug?slug=${encodeURIComponent(value)}`, { signal: controller.signal });
        const data = await response.json();
        setSlugState(data.available ? { state: "available" } : { state: "unavailable", reason: data.reason || t("cp.notAvailable") });
      } catch {
        if (!controller.signal.aborted) setSlugState({ state: "idle" });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, t]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          platform,
          profile_url: profileUrl,
          audience_size: audienceSize,
          video_url: videoUrl,
          promotion_plan: promotionPlan,
          accept_terms: acceptTerms,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t("cp.err.submit"));
      setApplication(data.application);
      setCanApplyAt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cp.err.submit"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPending || (session?.user && isLoading)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 md:py-10">
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="mb-4 text-muted-foreground">{t("cp.signInBody")}</p>
        <div className="flex justify-center gap-2">
          <Link href={`/sign-up?next=${encodeURIComponent(APPLY_PATH)}`}><Button>{t("cp.createAccount")}</Button></Link>
          <Link href={`/sign-in?next=${encodeURIComponent(APPLY_PATH)}`}><Button variant="outline">{t("cp.signIn")}</Button></Link>
        </div>
      </main>
    );
  }

  const canApply = canApplyAt !== null && new Date(canApplyAt).getTime() <= Date.now();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const canSubmit = slugState.state === "available" && platform && profileUrl.trim() && audienceSize && acceptTerms && !isSubmitting;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 md:py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("cp.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("cp.introPre")}{" "}
          <span className="font-medium text-foreground">{t("cp.introBold")}</span>{t("cp.introPost")}{" "}
          <Link href="/affiliate" className="underline underline-offset-4 hover:text-foreground">{t("cp.how")}</Link>
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {application?.status === "approved" && application.slug && (
        <section className="space-y-4 rounded-2xl border bg-background p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{t("cp.in")}</h2>
            <Badge variant="outline">{t("cp.approved")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("cp.shareBody")}</p>
          <CopyField label={t("cp.yourLink")} value={`${origin}/?ref=${application.slug}`} />
          <CopyField label={t("cp.yourCode")} value={application.slug.toUpperCase()} />
          {application.app_store_code_added_at ? (
            <CopyField label={t("cp.iphoneLink")} value={appStoreRedeemUrl(application.slug)} />
          ) : (
            <p className="text-xs text-muted-foreground">{t("cp.iphonePending")}</p>
          )}
        </section>
      )}

      {application?.status === "pending" && (
        <section className="rounded-2xl border bg-background p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{t("cp.received")}</h2>
            <Badge>{t("cp.review")}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("cp.reviewBody", { code: application.slug?.toUpperCase() ?? "" })}
          </p>
        </section>
      )}

      {application?.status === "revoked" && (
        <section className="rounded-2xl border bg-background p-5">
          <h2 className="text-sm font-semibold">{t("cp.revokedTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("cp.revokedBody")}</p>
        </section>
      )}

      {application?.status === "declined" && !canApply && (
        <section className="rounded-2xl border bg-background p-5">
          <h2 className="text-sm font-semibold">{t("cp.declined")}</h2>
          {application.decline_reason && <p className="mt-2 text-sm text-muted-foreground">{application.decline_reason}</p>}
          {canApplyAt && (
            <p className="mt-2 text-sm text-muted-foreground">{t("cp.applyAgain", { date: new Date(canApplyAt).toLocaleDateString(locale) })}</p>
          )}
        </section>
      )}

      {canApply && (
        <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-background p-5">
          <div>
            <Label htmlFor="slug">{t("cp.yourCode")}</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value.replace(/\s+/g, ""))}
              placeholder="maya"
              maxLength={20}
              autoComplete="off"
              className="mt-1.5 font-mono"
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {slugState.state === "checking" && <><Loader2 className="size-3 animate-spin" /> {t("cp.checking")}</>}
              {slugState.state === "available" && (
                <span className="text-green-700">
                  {t("cp.available", { link: `${origin}/?ref=${slug.trim().toLowerCase()}`, code: slug.trim().toUpperCase() })}
                </span>
              )}
              {slugState.state === "unavailable" && <span className="text-red-600">{slugState.reason}</span>}
              {slugState.state === "idle" && t("cp.slugHint")}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>{t("cp.where")}</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder={t("cp.pickPlatform")} /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((option) => <SelectItem key={option.value} value={option.value}>{option.value === "other" ? t("cp.platform.other") : option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("cp.followers")}</Label>
              <Select value={audienceSize} onValueChange={setAudienceSize}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder={t("cp.pickRange")} /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_SIZES.map((option) => <SelectItem key={option} value={option}>{t(`cp.size.${option}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="profile-url">{t("cp.profile")}</Label>
            <Input id="profile-url" type="url" value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)} placeholder="https://www.tiktok.com/@you" className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="video-url">{t("cp.video")} <span className="font-normal text-muted-foreground">{t("cp.optional")}</span></Label>
            <Input id="video-url" type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://" className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="plan">{t("cp.plan")} <span className="font-normal text-muted-foreground">{t("cp.optional")}</span></Label>
            <Textarea id="plan" value={promotionPlan} onChange={(event) => setPromotionPlan(event.target.value)} maxLength={1000} rows={3} className="mt-1.5" />
          </div>

          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-xs font-medium">{t("cp.terms")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {TERMS.map((term) => <li key={term}>{t(term)}</li>)}
            </ul>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <Checkbox checked={acceptTerms} onCheckedChange={(checked) => setAcceptTerms(checked === true)} />
              {t("cp.agree")}
            </label>
          </div>

          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? t("cp.submitting") : t("cp.apply")}
          </Button>
        </form>
      )}
    </main>
  );
}
