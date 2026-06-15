import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { resolveLocale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/types";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AStocks — Portfolio Tracker",
  description:
    "Track US and Korean stock holdings with live profit and loss updates.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers initialLocale={locale}>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
