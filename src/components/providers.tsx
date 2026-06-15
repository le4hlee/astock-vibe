"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";

export function Providers({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <LanguageProvider initialLocale={initialLocale}>
      <SessionProvider>{children}</SessionProvider>
    </LanguageProvider>
  );
}
