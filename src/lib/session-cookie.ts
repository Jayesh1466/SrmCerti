// Auth.js always gives the session cookie an Expires/Max-Age, which keeps users signed in after the
// browser closes. Stripping those attributes turns it into a browser-session cookie, so closing the
// browser signs the user out. Cookies being cleared (sign-out) keep their attributes.

const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?=/;

function isClearing(cookie: string) {
  if (/;\s*max-age=0\b/i.test(cookie)) return true;
  const expires = cookie.match(/;\s*expires=([^;]+)/i);
  return !!expires && new Date(expires[1]).getTime() <= Date.now();
}

function toBrowserSession(cookie: string) {
  return cookie.replace(/;\s*expires=[^;]*/gi, "").replace(/;\s*max-age=[^;]*/gi, "");
}

export function withBrowserSessionCookie<T extends Response>(res: T): T {
  const cookies = res.headers.getSetCookie();
  if (!cookies.some((c) => SESSION_COOKIE.test(c) && !isClearing(c))) return res;

  const headers = new Headers(res.headers);
  headers.delete("set-cookie");
  for (const c of cookies) {
    headers.append("set-cookie", SESSION_COOKIE.test(c) && !isClearing(c) ? toBrowserSession(c) : c);
  }
  // Rebuild rather than mutate: some responses (e.g. redirects) have immutable headers.
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers }) as T;
}
