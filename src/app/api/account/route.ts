import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      rememberMeDefault: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    rememberMe: session.rememberMe ?? user.rememberMeDefault,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      rememberMeDefault?: boolean;
    };

    const data: { name?: string | null; rememberMeDefault?: boolean } = {};

    if (body.name !== undefined) {
      data.name = body.name.trim() || null;
    }

    if (body.rememberMeDefault !== undefined) {
      data.rememberMeDefault = Boolean(body.rememberMeDefault);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        email: true,
        name: true,
        rememberMeDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ...user,
      rememberMe: data.rememberMeDefault ?? session.rememberMe ?? true,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to update account." },
      { status: 500 },
    );
  }
}
