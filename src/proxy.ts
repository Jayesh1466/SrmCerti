import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { withBrowserSessionCookie } from "@/lib/session-cookie";

const PROTECTED_PREFIXES = ["/dashboard", "/templates", "/assets", "/certificates", "/settings"];
// API routes that must stay reachable without a session: sign-in itself and public certificate verification (QR codes).
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/verify"];

const matchesPrefix = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");

const guard = auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const isPublic = PUBLIC_API_PREFIXES.some((p) => matchesPrefix(pathname, p));
    if (!isPublic && !req.auth) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p));
  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

// auth() refreshes the session cookie on each request; keep it a browser-session cookie.
export default async function proxy(...args: Parameters<typeof guard>) {
  const res = await guard(...args);
  return res instanceof Response ? withBrowserSessionCookie(res) : res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/templates/:path*",
    "/assets/:path*",
    "/certificates/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
