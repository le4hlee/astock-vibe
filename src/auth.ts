import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { parseRememberMe } from "@/lib/auth-session";
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
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

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
