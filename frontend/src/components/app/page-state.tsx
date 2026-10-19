"use client";

import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  const t = useT();
  return <div role="status" aria-label={t("shared.loading")} className="mx-auto max-w-5xl space-y-5 px-4 py-8">
    <span className="sr-only">{t("shared.loadingDots")}</span>
    <Skeleton className="h-9 w-48" />
    {[0, 1, 2].map((key) => <Skeleton key={key} className="h-32 w-full rounded-xl" />)}
  </div>;
}

export function PageError({ message, retry }: { message: string; retry?: () => void }) {
  const t = useT();
  return <div role="alert" className="mx-auto max-w-xl space-y-4 px-4 py-12 text-center">
    <h1 className="text-2xl font-semibold">{t("shared.somethingWrong")}</h1>
    <p className="text-muted-foreground">{message}</p>
    {retry && <Button variant="outline" onClick={retry}>{t("shared.tryAgain")}</Button>}
  </div>;
}
