import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import {
  enforceRateLimits,
  extractCredentialsEmail,
  getClientIp,
  isCredentialsLoginRequest,
  LOGIN_RATE_LIMITS,
  rateLimitResponse,
  recordRateLimitFailure,
  type RateLimitRule,
} from "@/lib/rate-limit";

async function guardCredentialsLogin(request: NextRequest): Promise<Response | null> {
  const ip = getClientIp(request);
  const email = await extractCredentialsEmail(request);

  const rules: RateLimitRule[] = [
    {
      key: `login:ip:${ip}`,
      limit: LOGIN_RATE_LIMITS.ip.limit,
      windowSeconds: LOGIN_RATE_LIMITS.ip.windowSeconds,
    },
  ];

  if (email) {
    rules.push({
      key: `login:email:${email}`,
      limit: LOGIN_RATE_LIMITS.email.limit,
      windowSeconds: LOGIN_RATE_LIMITS.email.windowSeconds,
    });
  }

  const result = await enforceRateLimits(rules);
  if (!result.allowed) {
    return rateLimitResponse(result.retryAfterSeconds);
  }

  await recordRateLimitFailure(
    `login:ip:${ip}`,
    LOGIN_RATE_LIMITS.ip.windowSeconds,
  );

  return null;
}

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  if (isCredentialsLoginRequest(request)) {
    const blocked = await guardCredentialsLogin(request);
    if (blocked) {
      return blocked;
    }
  }

  return handlers.POST(request);
}
