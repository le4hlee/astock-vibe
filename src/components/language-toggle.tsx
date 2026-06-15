"use client";

import { useLanguage } from "@/components/language-provider";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className={`flex rounded-lg border border-card-border p-1 ${className}`}
      role="group"
      aria-label={t("settings.language")}
    >
      {(["en", "ko"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            locale === option
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {option === "en" ? t("language.en") : t("language.ko")}
        </button>
      ))}
    </div>
  );
}
