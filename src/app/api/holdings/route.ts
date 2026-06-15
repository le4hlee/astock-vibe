import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const holdings = await prisma.holding.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(holdings);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      ticker?: string;
      name?: string;
      market?: "US" | "KR";
      currency?: "USD" | "KRW";
      shares?: number;
      avgPrice?: number;
    };

    const ticker = body.ticker?.trim().toUpperCase();
    const market = body.market;
    const currency = body.currency;
    const shares = body.shares;
    const avgPrice = body.avgPrice;

    if (!ticker || !market || !currency || !shares || !avgPrice) {
      return NextResponse.json(
        { error: "Ticker, market, currency, shares, and average price are required." },
        { status: 400 },
      );
    }

    if (shares <= 0 || avgPrice <= 0) {
      return NextResponse.json(
        { error: "Shares and average price must be greater than zero." },
        { status: 400 },
      );
    }

    if ((market === "US" && currency !== "USD") || (market === "KR" && currency !== "KRW")) {
      return NextResponse.json(
        { error: "US stocks must use USD and Korean stocks must use KRW." },
        { status: 400 },
      );
    }

    const holding = await prisma.holding.create({
      data: {
        userId: session.user.id,
        ticker,
        name: body.name?.trim() || null,
        market,
        currency,
        shares,
        avgPrice,
      },
    });

    return NextResponse.json(holding, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to create holding." },
      { status: 500 },
    );
  }
}
