"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Field, inputClass } from "@/components/auth-shell";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/components/language-provider";
import { REMEMBER_MAX_AGE, SESSION_MAX_AGE } from "@/lib/auth-session";

type Account = {
  email: string;
  name: string | null;
  rememberMeDefault: boolean;
  rememberMe: boolean;
  createdAt: string;
};

export function SettingsClient({
  userName,
  userEmail,
}: {
  userName?: string | null;
  userEmail?: string | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const { t } = useLanguage();
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccount() {
      try {
        const response = await fetch("/api/account", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load account");
        }
        const data = (await response.json()) as Account;
        setAccount(data);
        setName(data.name ?? "");
        setRememberMe(data.rememberMeDefault);
      } catch {
        setError(t("settings.loadError"));
      } finally {
        setLoading(false);
      }
    }

    void loadAccount();
    // Load once on mount; t reflects the locale from the server cookie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          rememberMeDefault: rememberMe,
        }),
      });

      const data = (await response.json()) as Account & { error?: string };

      if (!response.ok) {
        setError(data.error ?? t("settings.saveError"));
        return;
      }

      setAccount(data);
      await update({ rememberMe });
      setMessage(t("settings.saved"));
      router.refresh();
    } catch {
      setError(t("settings.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const rememberDays = Math.round(REMEMBER_MAX_AGE / 86400);
  const sessionHours = Math.round(SESSION_MAX_AGE / 3600);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted transition hover:text-foreground"
          >
            {t("nav.backToPortfolio")}
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="mt-2 text-muted">
            {userName || userEmail || t("settings.subtitle")}
          </p>
        </div>
        <LanguageToggle />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-card-border bg-card/60 p-10 text-center text-muted">
          {t("settings.loading")}
        </div>
      ) : error && !account ? (
        <div className="rounded-2xl border border-loss/40 bg-card/60 p-10 text-center text-loss">
          {error}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-card-border bg-card/60 p-6"
        >
          <div className="rounded-xl border border-card-border bg-background/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{t("settings.language")}</p>
                <p className="mt-1 text-sm text-muted">
                  {t("settings.languageHint")}
                </p>
              </div>
              <LanguageToggle />
            </div>
          </div>

          <Field label={t("settings.email")}>
            <input
              value={account?.email ?? userEmail ?? ""}
              readOnly
              className={`${inputClass} text-muted`}
            />
          </Field>

          <Field label={t("settings.displayName")}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("settings.optional")}
              autoComplete="name"
              className={inputClass}
            />
          </Field>

          <label className="flex items-start gap-3 rounded-xl border-2 border-accent/30 bg-accent-soft/10 p-4">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="mt-1 h-5 w-5 accent-accent"
            />
            <span>
              <span className="block font-semibold text-foreground">
                {t("settings.rememberDevice")}
              </span>
              <span className="mt-1 block text-sm text-muted">
                {t("settings.rememberDeviceHint", {
                  days: rememberDays,
                  hours: sessionHours,
                })}
              </span>
            </span>
          </label>

          {error ? <p className="text-sm text-loss">{error}</p> : null}
          {message ? <p className="text-sm text-profit">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? t("settings.saving") : t("settings.save")}
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-xl border border-card-border px-5 py-2.5 text-sm text-muted transition hover:border-loss hover:text-loss"
            >
              {t("nav.logOut")}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
