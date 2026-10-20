"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import { useLocale, useT, useTimeAgo } from "@/lib/i18n";
import type { Translate } from "@/lib/i18n";
import {
  ACTIVE_POST_STATUSES,
  PRIVACY_LABEL_KEYS,
  PROVIDER_LABELS,
  POST_STATUS_LABEL_KEYS,
  connectionLabel,
  formatDateTime,
  formatMetric,
  parseHashtagInput,
  type SocialConnection,
  type SocialPost,
  type SocialPostStatus,
  type SocialPrivacyLevel,
  type SocialProviderStatus,
} from "@/lib/social";

interface PublishableClip {
  id: string;
  clip_order: number;
  hook_title: string | null;
  text: string | null;
}

interface ClipAssets {
  title: string | null;
  description: string | null;
  hashtags: string[];
  thumbnail_headline: string | null;
  thumbnail: string | null;
}

interface ClipPublishButtonProps {
  taskId: string;
  clip: PublishableClip;
  connections: SocialConnection[];
  providers: SocialProviderStatus[];
  onChanged: () => void | Promise<void>;
}

interface ClipPostListProps {
  posts: SocialPost[];
  onChanged: () => void | Promise<void>;
}

const ALL_PRIVACY_LEVELS: SocialPrivacyLevel[] = ["public", "unlisted", "private"];

function privacyOptionsFor(provider: SocialProviderStatus | undefined): SocialPrivacyLevel[] {
  return provider?.supported_privacy_levels ?? ALL_PRIVACY_LEVELS;
}

// Each platform starts at its own default (TikTok: private, since unaudited
// apps cannot post publicly).
function defaultPrivacyFor(provider: SocialProviderStatus | undefined): SocialPrivacyLevel {
  const options = privacyOptionsFor(provider);
  const preferred = provider?.default_privacy_level;
  return preferred && options.includes(preferred) ? preferred : (options[0] ?? "private");
}

function toLocalDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}));
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  return fallback;
}

function postAccountName(post: SocialPost): string {
  return (
    post.account.display_name ||
    (post.account.username ? `@${post.account.username.replace(/^@/, "")}` : null) ||
    PROVIDER_LABELS[post.provider]
  );
}

function metricsSummary(post: SocialPost, t: Translate): string | null {
  if (!post.last_metrics_at || !post.metrics) return null;
  const { views, likes, comments } = post.metrics;
  const count = (value: number | null | undefined, one: "soc.view" | "soc.like" | "soc.comment", many: "soc.views" | "soc.likes" | "soc.comments") =>
    `${formatMetric(value)} ${t(value === 1 ? one : many)}`;
  return [count(views, "soc.view", "soc.views"), count(likes, "soc.like", "soc.likes"), count(comments, "soc.comment", "soc.comments")].join(" · ");
}

function PostStatus({ post }: { post: SocialPost }) {
  const t = useT();
  const locale = useLocale();
  const timeAgo = useTimeAgo();
  switch (post.status) {
    case "queued":
    case "publishing":
      return (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {post.status === "queued" ? t("pub.starting") : t("pub.uploading")}
        </span>
      );
    case "scheduled":
      return (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" />
          {post.scheduled_for ? formatDateTime(post.scheduled_for, locale) : t("soc.status.scheduled")}
        </span>
      );
    case "published":
      return (
        <span className="text-muted-foreground">
          {post.published_at ? t("pub.publishedAgo", { when: timeAgo(post.published_at) }) : t("pub.published")}
        </span>
      );
    case "failed":
      return <span className="text-destructive">{t("soc.status.failed")}</span>;
    default:
      return <span className="text-muted-foreground">{t(POST_STATUS_LABEL_KEYS[post.status])}</span>;
  }
}

/**
 * Toasts when a post the user is watching changes state, so publishing never
 * "just happens" silently. Statuses seen on first load are only recorded.
 */
export function useSocialPostToasts(posts: SocialPost[]) {
  const t = useT();
  const seen = useRef<Map<string, SocialPostStatus> | null>(null);
  useEffect(() => {
    const previous = seen.current;
    const next = new Map(posts.map((post) => [post.id, post.status] as const));
    seen.current = next;
    if (!previous) return;
    for (const post of posts) {
      const before = previous.get(post.id);
      if (!before || before === post.status) continue;
      const id = postToastId(post.id);
      const platform = PROVIDER_LABELS[post.provider];
      if (post.status === "published") {
        toast.success(t("pub.publishedTo", { platform }), {
          id,
          description: post.privacy_level === "public" ? undefined : t("pub.visibility", { level: t(PRIVACY_LABEL_KEYS[post.privacy_level]) }),
          action: post.external_url
            ? { label: t("pub.open"), onClick: () => window.open(post.external_url!, "_blank", "noopener") }
            : undefined,
        });
      } else if (post.status === "failed") {
        toast.error(t("pub.couldntPublish", { platform }), { id, description: post.error_message ?? undefined });
      } else if (ACTIVE_POST_STATUSES.includes(post.status)) {
        toast.loading(t("pub.publishingTo", { platform }), { id });
      }
    }
  }, [posts, t]);
}

function postToastId(postId: string) {
  return `social-post-${postId}`;
}

export function ClipPostList({ posts, onChanged }: ClipPostListProps) {
  const t = useT();
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  const runPostAction = async (post: SocialPost, action: "cancel" | "retry" | "refresh-metrics" | "delete") => {
    setBusyPostId(post.id);
    try {
      const response = await fetch(
        action === "delete" ? `/api/social/posts/${post.id}` : `/api/social/posts/${post.id}/${action}`,
        { method: action === "delete" ? "DELETE" : "POST" },
      );
      if (!response.ok) {
        toast.error(await readError(response, t("pub.actionFailed")));
      } else if (action === "retry") {
        toast.loading(t("pub.publishingTo", { platform: PROVIDER_LABELS[post.provider] }), { id: postToastId(post.id) });
      } else if (action === "cancel") {
        toast.success(t("pub.postCancelled"));
      } else if (action === "refresh-metrics") {
        toast.success(t("pub.metricsUpdated"));
      }
      await onChanged();
    } finally {
      setBusyPostId(null);
    }
  };

  if (posts.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {posts.map((post) => {
        const busy = busyPostId === post.id;
        const metrics = metricsSummary(post, t);
        const canCancel = post.status === "scheduled" || post.status === "queued";
        const canRetry = post.status === "failed" || post.status === "cancelled";
        const canRefresh = post.status === "published" && Boolean(post.external_post_id);
        const canRemove = post.status !== "queued" && post.status !== "publishing";
        const hasMenu = canCancel || canRetry || canRefresh || canRemove;
        return (
          <div key={post.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm">
            <SocialProviderIcon provider={post.provider} className="text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{postAccountName(post)}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="shrink-0"><PostStatus post={post} /></span>
              </div>
              {post.status === "failed" && post.error_message ? (
                <p className="mt-0.5 line-clamp-2 text-xs text-destructive" title={post.error_message}>
                  {post.error_message}
                </p>
              ) : metrics ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{metrics}</p>
              ) : null}
            </div>
            {post.status === "published" && post.external_url && (
              <Button asChild size="icon" variant="ghost" className="size-8 text-muted-foreground">
                <a href={post.external_url} target="_blank" rel="noreferrer" aria-label={t("pub.openPost")}>
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            )}
            {hasMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" disabled={busy} aria-label={t("pub.postActions")}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canRefresh && (
                    <DropdownMenuItem onSelect={() => runPostAction(post, "refresh-metrics")}>
                      <RefreshCw /> {t("pub.refreshMetrics")}
                    </DropdownMenuItem>
                  )}
                  {canRetry && (
                    <DropdownMenuItem onSelect={() => runPostAction(post, "retry")}>
                      <RotateCcw /> {t("pub.tryAgain")}
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <DropdownMenuItem onSelect={() => runPostAction(post, "cancel")}>
                      <XCircle /> {t("pub.cancelPost")}
                    </DropdownMenuItem>
                  )}
                  {canRemove && (canRefresh || canRetry || canCancel) && <DropdownMenuSeparator />}
                  {canRemove && (
                    <DropdownMenuItem variant="destructive" onSelect={() => runPostAction(post, "delete")}>
                      <Trash2 /> {t("pub.remove")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ClipPublishButton({
  taskId,
  clip,
  connections,
  providers,
  onChanged,
}: ClipPublishButtonProps) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [privacy, setPrivacy] = useState<SocialPrivacyLevel>("private");
  const [schedule, setSchedule] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [aiBusy, setAiBusy] = useState<"all" | "thumbnail" | null>(null);

  const activeConnections = useMemo(
    () => connections.filter((connection) => connection.status !== "revoked"),
    [connections],
  );
  const providerForAccount = (id: string) =>
    providers.find(
      (provider) =>
        provider.provider === activeConnections.find((connection) => connection.id === id)?.provider,
    );
  const selectedConnection = activeConnections.find((connection) => connection.id === accountId);
  const privacyOptions = privacyOptionsFor(providerForAccount(accountId));
  const anyProviderConfigured = providers.some((provider) => provider.configured);

  // The form resets only when the sheet opens, so connections refreshing in
  // the background never wipe what the user is typing.
  const openSheet = () => {
    const nextAccountId = activeConnections.some((connection) => connection.id === accountId)
      ? accountId
      : (activeConnections[0]?.id ?? "");
    setError(null);
    setTitle(clip.hook_title || t("clip.title", { order: clip.clip_order }));
    setCaption(clip.text || "");
    setHashtags("");
    setSchedule(false);
    setScheduledFor(toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
    setAccountId(nextAccountId);
    setPrivacy(defaultPrivacyFor(providerForAccount(nextAccountId)));
    setThumbnail(null);
    setHeadline("");
    setOpen(true);
    void loadSavedAssets();
  };

  const applyAssets = (assets: ClipAssets, fillFields: boolean) => {
    if (fillFields) {
      if (assets.title) setTitle(assets.title);
      if (assets.description) setCaption(assets.description);
      if (assets.hashtags.length > 0) setHashtags(assets.hashtags.join(", "));
    }
    setThumbnail(assets.thumbnail);
    setHeadline(assets.thumbnail_headline ?? "");
  };

  // Assets generated earlier (e.g. before closing the sheet) come back as-is.
  const loadSavedAssets = async () => {
    try {
      const response = await fetch(`/api/social/clips/${clip.id}/assets`);
      if (!response.ok) return;
      const { assets } = (await response.json()) as { assets?: ClipAssets };
      if (assets) applyAssets(assets, true);
    } catch {
      // Optional prefill; the form works without it.
    }
  };

  const generateWithAi = async (scope: "all" | "thumbnail") => {
    setAiBusy(scope);
    setError(null);
    try {
      const response = await fetch(`/api/social/clips/${clip.id}/assets/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          scope === "all"
            ? { copy: true, thumbnail: true }
            : { copy: false, thumbnail: true, headline },
        ),
      });
      if (!response.ok) throw new Error(await readError(response, t("pub.ai.failed")));
      const { assets } = (await response.json()) as { assets: ClipAssets };
      applyAssets(assets, scope === "all");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pub.ai.failed"));
    } finally {
      setAiBusy(null);
    }
  };

  const removeThumbnail = async () => {
    const response = await fetch(`/api/social/clips/${clip.id}/assets/thumbnail`, { method: "DELETE" });
    if (response.ok) setThumbnail(null);
    else setError(await readError(response, t("pub.actionFailed")));
  };

  const selectAccount = (id: string) => {
    setAccountId(id);
    setPrivacy(defaultPrivacyFor(providerForAccount(id)));
  };

  // Without a configured platform there is nothing to publish to.
  if (!anyProviderConfigured) return null;

  const handleSubmit = async () => {
    if (!accountId) {
      setError(t("pub.chooseAccount"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        task_id: taskId,
        clip_id: clip.id,
        social_account_id: accountId,
        title: title.trim(),
        caption,
        hashtags: parseHashtagInput(hashtags),
        privacy_level: privacy,
      };
      if (schedule && scheduledFor) {
        const when = new Date(scheduledFor);
        if (Number.isNaN(when.getTime())) {
          throw new Error(t("pub.validDate"));
        }
        body.scheduled_for = when.toISOString();
      }
      const response = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(await readError(response, t("pub.failed")));
      }
      const { post } = (await response.json().catch(() => ({}))) as { post?: SocialPost };
      const platform = PROVIDER_LABELS[selectedConnection?.provider ?? "youtube"];
      if (body.scheduled_for) {
        toast.success(t("pub.scheduledFor", { when: formatDateTime(String(body.scheduled_for), locale) }), {
          description: `${platform} · ${selectedConnection ? connectionLabel(selectedConnection) : ""}`,
        });
      } else if (post?.id) {
        toast.loading(t("pub.publishingTo", { platform }), {
          id: postToastId(post.id),
          description: t("pub.keepWorking"),
        });
      }
      setOpen(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pub.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={openSheet}>
        <Send className="w-4 h-4" />
        {t("pub.publish")}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("pub.sheetTitle", { order: clip.clip_order })}</SheetTitle>
            <SheetDescription>
              {t("pub.sheetDesc")}
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4 space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {activeConnections.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {t("pub.noAccounts")}{" "}
                <Link href="/settings/social" className="font-medium text-foreground underline underline-offset-4">
                  {t("pub.connectLink")}
                </Link>{" "}
                {t("pub.toPublishFromHere")}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`publish-account-${clip.id}`}>{t("pub.account")}</Label>
                  <Select value={accountId} onValueChange={selectAccount}>
                    <SelectTrigger id={`publish-account-${clip.id}`} className="w-full">
                      <SelectValue placeholder={t("pub.chooseAccountPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeConnections.map((connection) => (
                        <SelectItem
                          key={connection.id}
                          value={connection.id}
                          disabled={connection.status === "reauth_required"}
                        >
                          <SocialProviderIcon provider={connection.provider} />
                          {PROVIDER_LABELS[connection.provider]} · {connectionLabel(connection)}
                          {connection.status === "reauth_required" ? t("pub.reconnectRequired") : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{t("pub.ai.title")}</p>
                      <p className="text-xs text-muted-foreground">{t("pub.ai.desc")}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={aiBusy !== null}
                      onClick={() => generateWithAi("all")}
                    >
                      {aiBusy === "all" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      {aiBusy === "all" ? t("pub.ai.generating") : thumbnail ? t("pub.ai.regenerate") : t("pub.ai.generate")}
                    </Button>
                  </div>
                  {thumbnail && (
                    <div className="flex gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnail}
                        alt={t("pub.ai.thumbAlt")}
                        className="h-40 w-[90px] shrink-0 rounded-md border object-cover"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label htmlFor={`publish-headline-${clip.id}`}>{t("pub.ai.headline")}</Label>
                        <Input
                          id={`publish-headline-${clip.id}`}
                          value={headline}
                          maxLength={60}
                          onChange={(event) => setHeadline(event.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={aiBusy !== null || !headline.trim()}
                            onClick={() => generateWithAi("thumbnail")}
                          >
                            {aiBusy === "thumbnail" && <Loader2 className="size-4 animate-spin" />}
                            {t("pub.ai.updateThumb")}
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8" asChild>
                            <a href={thumbnail} download={`thumbnail-${clip.clip_order}.jpg`} aria-label={t("pub.ai.download")}>
                              <Download className="size-4" />
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label={t("pub.ai.remove")}
                            onClick={removeThumbnail}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{t("pub.ai.thumbHint")}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`publish-title-${clip.id}`}>{t("pub.title")}</Label>
                  <Input
                    id={`publish-title-${clip.id}`}
                    value={title}
                    maxLength={selectedConnection?.provider === "youtube" ? 100 : 255}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  {selectedConnection?.provider === "tiktok" && (
                    <p className="text-xs text-muted-foreground">{t("pub.tiktokTitle")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`publish-caption-${clip.id}`}>{t("pub.caption")}</Label>
                  <Textarea
                    id={`publish-caption-${clip.id}`}
                    value={caption}
                    rows={5}
                    maxLength={2200}
                    onChange={(event) => setCaption(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`publish-hashtags-${clip.id}`}>{t("pub.hashtags")}</Label>
                  <Input
                    id={`publish-hashtags-${clip.id}`}
                    value={hashtags}
                    placeholder={t("pub.hashtagsPlaceholder")}
                    onChange={(event) => setHashtags(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`publish-privacy-${clip.id}`}>{t("pub.visibilityLabel")}</Label>
                  <Select value={privacy} onValueChange={(value) => setPrivacy(value as SocialPrivacyLevel)}>
                    <SelectTrigger id={`publish-privacy-${clip.id}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {privacyOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(PRIVACY_LABEL_KEYS[option])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedConnection?.provider === "tiktok" && (
                    <p className="text-xs text-muted-foreground">
                      {t("pub.tiktokPrivate")}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{t("pub.scheduleLater")}</p>
                    <p className="text-xs text-muted-foreground">{t("pub.scheduleLaterDesc")}</p>
                  </div>
                  <Switch checked={schedule} onCheckedChange={setSchedule} />
                </div>
                {schedule && (
                  <div className="space-y-2">
                    <Label htmlFor={`publish-when-${clip.id}`}>{t("pub.publishAt")}</Label>
                    <Input
                      id={`publish-when-${clip.id}`}
                      type="datetime-local"
                      value={scheduledFor}
                      min={toLocalDateTimeInput(new Date())}
                      onChange={(event) => setScheduledFor(event.target.value)}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              {t("pub.cancel")}
            </Button>
            {activeConnections.length > 0 && (
              <Button onClick={handleSubmit} disabled={isSubmitting || !accountId}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : schedule ? <Clock className="size-4" /> : <Send className="size-4" />}
                {isSubmitting ? (schedule ? t("pub.scheduling") : t("pub.publishing")) : schedule ? t("pub.schedule") : t("pub.publishNow")}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
