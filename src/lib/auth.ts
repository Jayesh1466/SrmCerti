import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const ACCOUNT_RECHECK_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The cookie itself ends with the browser session (see session-cookie.ts); maxAge is a backstop for
  // browsers that restore session cookies on restart, and is extended while the site is in use.
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.checkedAt = Date.now();
        return token;
      }
      // Sessions are stateless JWTs, so periodically re-check the account still exists; this signs out
      // anyone whose account was removed (e.g. the demo admin). Checking on every request would add a
      // database round trip to each page load, so it's done at most every few minutes.
      if (!token.uid) return null;
      if (Date.now() - ((token.checkedAt as number) || 0) < ACCOUNT_RECHECK_MS) return token;
      const exists = await prisma.user.findUnique({ where: { id: token.uid as string }, select: { id: true } });
      if (!exists) return null;
      token.checkedAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
});
