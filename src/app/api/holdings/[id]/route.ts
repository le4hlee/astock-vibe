import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.holding.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Holding not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      ticker?: string;
      name?: string;
      market?: "US" | "KR";
      currency?: "USD" | "KRW";
      shares?: number;
      avgPrice?: number;
    };

    const market = body.market ?? existing.market;
    const currency = body.currency ?? existing.currency;

    if ((market === "US" && currency !== "USD") || (market === "KR" && currency !== "KRW")) {
      return NextResponse.json(
        { error: "US stocks must use USD and Korean stocks must use KRW." },
        { status: 400 },
      );
    }

    const shares = body.shares ?? existing.shares;
    const avgPrice = body.avgPrice ?? existing.avgPrice;

    if (shares <= 0 || avgPrice <= 0) {
      return NextResponse.json(
        { error: "Shares and average price must be greater than zero." },
        { status: 400 },
      );
    }

    const holding = await prisma.holding.update({
      where: { id },
      data: {
        ticker: body.ticker?.trim().toUpperCase() ?? existing.ticker,
        name: body.name !== undefined ? body.name.trim() || null : existing.name,
        market,
        currency,
        shares,
        avgPrice,
      },
    });

    return NextResponse.json(holding);
  } catch {
    return NextResponse.json(
      { error: "Unable to update holding." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const existing = await prisma.holding.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Holding not found." }, { status: 404 });
  }

  await prisma.holding.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
