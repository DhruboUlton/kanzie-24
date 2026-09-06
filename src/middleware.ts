import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSessionSecret } from "@/lib/secret";

const COOKIE_NAME = "kanzie_admin_session";

// Lazy so the module import during `next build` doesn't trip the
// production fail-hard in getSessionSecret() — the check belongs on a real
// request.
let cachedSecretKey: Uint8Array | null = null;
function secretKey(): Uint8Array {
  if (!cachedSecretKey) {
    cachedSecretKey = new TextEncoder().encode(getSessionSecret());
  }
  return cachedSecretKey;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (!pathname.startsWith("/adpnl")) return NextResponse.next();

  // /adpnl/login is never gated here. Whether someone already holding a
  // session cookie should be bounced onward to /adpnl is decided exactly
  // once, authoritatively, by the login page itself via getAdminContext() —
  // the same database-backed check every protected page uses (see
  // src/app/(admin)/adpnl/login/page.tsx and src/lib/admin-guard.ts).
  //
  // This used to be decided here too, from JWT signature validity alone.
  // A JWT can verify (right secret, not expired) for an account that
  // getAdminContext() no longer accepts — deleted, deactivated, or with its
  // role removed. When that happened, this redirected /adpnl/login -> /adpnl,
  // the page-level guard on /adpnl redirected straight back, and the two
  // checks disagreed forever: ERR_TOO_MANY_REDIRECTS, with no way to reach
  // the sign-in form to get a fresh cookie.
  if (pathname === "/adpnl/login") return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL("/adpnl/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, secretKey());
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/adpnl/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/adpnl/:path*"],
};
