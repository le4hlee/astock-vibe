import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { parseRememberMe } from "@/lib/auth-session";
import {
  clearRateLimit,
  LOGIN_RATE_LIMITS,
  recordRateLimitFailure,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();
        const rememberMeRaw = credentials?.rememberMe;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await recordRateLimitFailure(
            `login:email:${email}`,
            LOGIN_RATE_LIMITS.email.windowSeconds,
          );
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await recordRateLimitFailure(
            `login:email:${email}`,
            LOGIN_RATE_LIMITS.email.windowSeconds,
          );
          return null;
        }

        await clearRateLimit(`login:email:${email}`);

        const rememberMe =
          rememberMeRaw === undefined || rememberMeRaw === ""
            ? user.rememberMeDefault
            : parseRememberMe(rememberMeRaw);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          rememberMe,
        };
      },
    }),
  ],
});
