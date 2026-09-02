import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "kanzie_admin_session";
const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || "kanzie-super-secure-admin-secret-key-32chars!"
);

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // /admin/login is never gated here. Whether someone already holding a
  // session cookie should be bounced onward to /admin is decided exactly
  // once, authoritatively, by the login page itself via getAdminContext() —
  // the same database-backed check every protected page uses (see
  // src/app/(admin)/admin/login/page.tsx and src/lib/admin-guard.ts).
  //
  // This used to be decided here too, from JWT signature validity alone.
  // A JWT can verify (right secret, not expired) for an account that
  // getAdminContext() no longer accepts — deleted, deactivated, or with its
  // role removed. When that happened, this redirected /admin/login -> /admin,
  // the page-level guard on /admin redirected straight back, and the two
  // checks disagreed forever: ERR_TOO_MANY_REDIRECTS, with no way to reach
  // the sign-in form to get a fresh cookie.
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, SECRET_KEY);
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
