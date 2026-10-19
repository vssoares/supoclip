"use client";

import { PageError } from "@/components/app/page-state";
import { useT } from "@/lib/i18n";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useT();
  return <PageError message={t("err.page")} retry={reset} />;
}
