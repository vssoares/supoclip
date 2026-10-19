"use client";

import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { track } from "@/lib/datafast";
import { useT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/en";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categories: { value: string; label: MessageKey }[] = [
  { value: "bug", label: "fb.bug" },
  { value: "feature", label: "fb.feature" },
  { value: "general", label: "fb.general" },
  { value: "sales", label: "fb.sales" },
];

export function FeedbackButton() {
  const t = useT();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!session?.user) return null;

  const handleSubmit = async () => {
    if (!category || !message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || t("fb.failed"));
      }

      toast.success(t("fb.thanks"));
      track("feedback_submitted", {
        category,
      });
      setCategory("");
      setMessage("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("fb.wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          aria-label={t("fb.aria")}
          className="fixed bottom-5 right-5 z-50 h-11 w-11 rounded-full shadow-lg max-md:[body:has([data-app-shell])_&]:bottom-[calc(5rem+env(safe-area-inset-bottom))]"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-80"
        sideOffset={12}
      >
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">{t("fb.title")}</h3>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("fb.category")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {t(c.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder={t("fb.placeholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={2000}
          />

          <Button
            className="w-full"
            disabled={!category || !message.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("fb.submit")
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
