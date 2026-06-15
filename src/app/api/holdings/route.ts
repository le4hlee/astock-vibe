import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizeHoldingData, validateHoldingInput } from "@/lib/holdings";
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
      shares?: number;
      avgPrice?: number;
      boughtInKrw?: boolean;
    };

    const validationError = validateHoldingInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const data = normalizeHoldingData(body);

    const holding = await prisma.holding.create({
      data: {
        userId: session.user.id,
        ...data,
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
