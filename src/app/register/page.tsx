"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell, Field, inputClass } from "@/components/auth-shell";
import { useLanguage } from "@/components/language-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? t("register.error"));
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <AuthShell title={t("register.title")} subtitle={t("register.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t("register.nameOptional")}>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className={inputClass}
          />
        </Field>
        <Field label={t("register.email")}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className={inputClass}
          />
        </Field>
        <Field label={t("register.password")}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-accent py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? t("register.creating") : t("register.submit")}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {t("register.hasAccount")}{" "}
        <Link href="/login" className="text-accent hover:underline">
          {t("nav.logIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
