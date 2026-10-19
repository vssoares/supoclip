import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getLocale } from "@/lib/i18n/server";
import { makeTranslator } from "@/lib/i18n/translate";

export default async function NotFound() {
  const t = makeTranslator(await getLocale());
  return <main className="mx-auto max-w-xl space-y-4 px-4 py-20 text-center">
    <h1 className="text-2xl font-semibold">{t("nf.title")}</h1>
    <p className="text-muted-foreground">{t("nf.body")}</p>
    <Button asChild><Link href="/">{t("nf.back")}</Link></Button>
  </main>;
}
