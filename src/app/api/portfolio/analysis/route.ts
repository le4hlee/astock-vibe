import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildPortfolioAnalysis } from "@/lib/portfolio-analysis";
import { buildPortfolioSummary } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { fetchStockProfile } from "@/lib/stock-profile";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const currencyParam = searchParams.get("currency");
  const displayCurrency = currencyParam === "KRW" ? "KRW" : "USD";

  const holdings = await prisma.holding.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const summary = await buildPortfolioSummary(holdings, displayCurrency);

  const profiles = Object.fromEntries(
    await Promise.all(
      summary.holdings.map(async (holding) => {
        const profile = await fetchStockProfile(holding.ticker, holding.market);
        return [holding.id, profile] as const;
      }),
    ),
  );

  const analysis = buildPortfolioAnalysis(
    summary.holdings,
    profiles,
    displayCurrency,
    summary.usdKrwRate,
  );

  return NextResponse.json(analysis);
}
