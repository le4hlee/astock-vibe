import type { NextAuthConfig } from "next-auth";
import {
  parseRememberMe,
  REMEMBER_MAX_AGE,
  sessionMaxAge,
} from "@/lib/auth-session";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: REMEMBER_MAX_AGE,
    updateAge: 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn;
      }

      if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.rememberMe = user.rememberMe ?? true;
      }

      if (trigger === "update" && session && "rememberMe" in session) {
        token.rememberMe = parseRememberMe(session.rememberMe);
      }

      const rememberMe = parseRememberMe(token.rememberMe ?? true);
      token.exp = Math.floor(Date.now() / 1000) + sessionMaxAge(rememberMe);

      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      session.rememberMe = parseRememberMe(token.rememberMe ?? true);
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
