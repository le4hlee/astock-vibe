import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildPortfolioSummary } from "@/lib/portfolio";

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
  return NextResponse.json(summary);
}
