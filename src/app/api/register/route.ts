import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function databaseErrorMessage(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Database is not connected. Set DATABASE_URL in your environment and run migrations.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return "Database tables are missing. Run: npx prisma migrate deploy";
    }
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Can't reach database server")) {
    return "Database is not reachable. Check DATABASE_URL and ensure the database is running.";
  }

  if (message.includes("placeholder") || message.includes("@HOST:")) {
    return "DATABASE_URL still uses placeholder values. Add a real Postgres connection string.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const name = body.name?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration failed:", error);

    const dbMessage = databaseErrorMessage(error);
    return NextResponse.json(
      { error: dbMessage ?? "Unable to create account." },
      { status: 500 },
    );
  }
}
