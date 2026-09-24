import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/templates", "/assets", "/certificates"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/templates/:path*",
    "/assets/:path*",
    "/certificates/:path*",
  ],
};
