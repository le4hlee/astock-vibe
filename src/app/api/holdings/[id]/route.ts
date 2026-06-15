import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizeHoldingData, validateHoldingInput } from "@/lib/holdings";
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
      shares?: number;
      avgPrice?: number;
      boughtInKrw?: boolean;
    };

    const merged = {
      ticker: body.ticker ?? existing.ticker,
      name: body.name !== undefined ? body.name : existing.name ?? undefined,
      market: body.market ?? existing.market,
      shares: body.shares ?? existing.shares,
      avgPrice: body.avgPrice ?? existing.avgPrice,
      boughtInKrw:
        body.boughtInKrw !== undefined
          ? body.boughtInKrw
          : existing.boughtInKrw,
    };

    const validationError = validateHoldingInput(merged);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const data = normalizeHoldingData(merged);

    const holding = await prisma.holding.update({
      where: { id },
      data: {
        ticker: data.ticker,
        name: data.name,
        market: data.market,
        currency: data.currency,
        boughtInKrw: data.boughtInKrw,
        shares: data.shares,
        avgPrice: data.avgPrice,
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
