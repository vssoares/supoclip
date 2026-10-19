"use client";

import { useState } from "react";
import { signIn } from "../../lib/auth-client";
import { postAuthPath } from "@/lib/auth-redirect";
import { track } from "@/lib/datafast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const t = useT();
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSucceeded(false);

    const response = await signIn.email({
      email,
      password,
    });

    if (response.error) {
      setMessage(response.error.message || t("auth.signIn.failed"));
      setLoading(false);
      return;
    }

    track("signin_completed", {
      auth_method: "email",
    });
    setSucceeded(true);
    setMessage(t("auth.signIn.success"));
    setLoading(false);

    // Redirect after successful sign in
    setTimeout(() => {
      router.push(postAuthPath(window.location.search));
      router.refresh();
    }, 500);
  };

  return (
    <div className="w-full">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.signIn.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.signIn.subtitle")}</p>
      <div className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            className="h-11"
            type="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <Input
            className="h-11"
            type="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? t("auth.signIn.loading") : t("auth.signIn.button")}
          </Button>
        </form>
        {message && (
          <p className={`mt-4 text-sm ${succeeded ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
