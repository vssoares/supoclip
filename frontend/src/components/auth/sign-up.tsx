"use client";

import { useState } from "react";
import { signUp } from "../../lib/auth-client";
import { attributionMetadata, getAnonymousAttribution } from "@/lib/attribution";
import { postAuthPath } from "@/lib/auth-redirect";
import { track } from "@/lib/datafast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useT } from "@/lib/i18n";

export function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const t = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSucceeded(false);

    const response = await signUp.email({
      email,
      password,
      name,
    });

    if (response.error) {
      setMessage(response.error.message || t("auth.signUp.failed"));
      setLoading(false);
      return;
    }

    track("signup_completed", {
      auth_method: "email",
      ...attributionMetadata(getAnonymousAttribution()),
    });
    setSucceeded(true);
    setMessage(t("auth.signUp.success"));
    setLoading(false);

    // Automatically sign in after successful sign up
    setTimeout(() => {
      window.location.href = postAuthPath(window.location.search);
    }, 1000);
  };

  return (
    <div className="w-full">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.signUp.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.signUp.subtitle")}</p>
      <div className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            className="h-11"
            type="text"
            placeholder={t("auth.fullName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
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
            minLength={8}
          />
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? t("auth.signUp.loading") : t("auth.signUp.button")}
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
