"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/components/language-provider";

export function HomeClient() {
  const { t } = useLanguage();

  const features = [
    {
      title: t("home.feature.dualCurrency.title"),
      body: t("home.feature.dualCurrency.body"),
    },
    {
      title: t("home.feature.liveQuotes.title"),
      body: t("home.feature.liveQuotes.body"),
    },
    {
      title: t("home.feature.privateAccount.title"),
      body: t("home.feature.privateAccount.body"),
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
      <header className="mb-16 flex items-center justify-between gap-4">
        <div className="text-xl font-semibold tracking-tight">{t("app.name")}</div>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
          >
            {t("nav.logIn")}
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            {t("nav.signUp")}
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-8">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-accent">
            {t("home.tagline")}
          </p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            {t("home.title")}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            {t("home.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-card-border bg-card/70 p-5 backdrop-blur"
            >
              <h2 className="font-medium">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/register"
          className="inline-flex w-fit rounded-xl bg-accent px-6 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          {t("home.getStarted")}
        </Link>
      </section>
    </main>
  );
}
