"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { AuthShell, Field, inputClass } from "@/components/auth-shell";
import { useLanguage } from "@/components/language-provider";
import { REMEMBER_MAX_AGE } from "@/lib/auth-session";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    const saved = localStorage.getItem("astocks-remember-me");
    return saved === null ? true : saved === "true";
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const registered = searchParams.get("registered") === "1";
  const rememberDays = Math.round(REMEMBER_MAX_AGE / 86400);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    localStorage.setItem("astocks-remember-me", String(rememberMe));

    const result = await signIn("credentials", {
      email,
      password,
      rememberMe: rememberMe ? "true" : "false",
      redirect: false,
    });

    setLoading(false);

    if (result?.status === 429) {
      setError(t("login.rateLimitedSoon"));
      return;
    }

    if (result?.error) {
      if (result.error.toLowerCase().includes("too many")) {
        setError(t("login.rateLimitedSoon"));
        return;
      }
      setError(t("login.invalidCredentials"));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell title={t("login.title")} subtitle={t("login.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {registered ? (
          <p className="rounded-xl border border-profit/30 bg-profit/10 px-4 py-3 text-sm text-profit">
            {t("login.registered")}
          </p>
        ) : null}
        <Field label={t("login.email")}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className={inputClass}
          />
        </Field>
        <Field label={t("login.password")}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </Field>
        <label className="flex items-start gap-3 rounded-xl border border-card-border bg-background/40 p-4">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span>
            <span className="block text-sm font-medium">
              {t("login.rememberDevice")}
            </span>
            <span className="mt-1 block text-xs text-muted">
              {t("login.rememberDeviceHint", { days: rememberDays })}
            </span>
          </span>
        </label>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-accent py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? t("login.signingIn") : t("login.submit")}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {t("login.noAccount")}{" "}
        <Link href="/register" className="text-accent hover:underline">
          {t("nav.signUp")}
        </Link>
      </p>
    </AuthShell>
  );
}
