import { prisma } from "@/lib/prisma";

export type RateLimitRule = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export async function checkRateLimit(
  key: string,
  limit: number,
): Promise<RateLimitResult> {
  const now = new Date();

  await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  const bucket = await prisma.rateLimitBucket.findUnique({
    where: { key },
  });

  if (!bucket) {
    return { allowed: true };
  }

  if (bucket.expiresAt <= now) {
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  return { allowed: true };
}

export async function recordRateLimitFailure(
  key: string,
  windowSeconds: number,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  const existing = await prisma.rateLimitBucket.findUnique({
    where: { key },
  });

  if (!existing || existing.expiresAt <= now) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, expiresAt },
      update: { count: 1, expiresAt },
    });
    return;
  }

  await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
}

export async function clearRateLimit(key: string): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
}

export async function enforceRateLimits(
  rules: RateLimitRule[],
): Promise<RateLimitResult> {
  for (const rule of rules) {
    const result = await checkRateLimit(rule.key, rule.limit);
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

export async function recordRateLimitFailures(
  rules: Array<{ key: string; windowSeconds: number }>,
): Promise<void> {
  for (const rule of rules) {
    await recordRateLimitFailure(rule.key, rule.windowSeconds);
  }
}

export const LOGIN_RATE_LIMITS = {
  ip: { limit: 30, windowSeconds: 15 * 60 },
  email: { limit: 10, windowSeconds: 15 * 60 },
} as const;

export const REGISTER_RATE_LIMITS = {
  ip: { limit: 10, windowSeconds: 60 * 60 },
  email: { limit: 5, windowSeconds: 60 * 60 },
} as const;

export function rateLimitResponse(retryAfterSeconds?: number): Response {
  return Response.json(
    {
      error: "Too many attempts. Please try again later.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: retryAfterSeconds
        ? { "Retry-After": String(retryAfterSeconds) }
        : undefined,
    },
  );
}

export async function extractCredentialsEmail(
  request: Request,
): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.clone().json()) as { email?: string };
      return body.email?.trim().toLowerCase() ?? null;
    }

    const form = await request.clone().formData();
    const email = form.get("email");
    return email?.toString().trim().toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export function isCredentialsLoginRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return (
    request.method === "POST" && pathname.endsWith("/callback/credentials")
  );
}
