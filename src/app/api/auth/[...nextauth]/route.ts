import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { withBrowserSessionCookie } from "@/lib/session-cookie";

// Sign-in and session refreshes set the session cookie here; make it end when the browser closes.
export async function GET(req: NextRequest) {
  return withBrowserSessionCookie(await handlers.GET(req));
}

export async function POST(req: NextRequest) {
  return withBrowserSessionCookie(await handlers.POST(req));
}
