import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getSessionSecret } from "@/lib/secret";
import { STAFF_MARKER_COOKIE } from "@/lib/integrations-shared";

const COOKIE_NAME = "kanzie_admin_session";

// How much age a token needs before it is worth reissuing.
const REFRESH_AFTER_SECONDS = 60;

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
    const { payload } = await jwtVerify(token, secretKey());
    return slideSession(req, payload);
  } catch {
    // Expired counts as failed here, which is the whole mechanism: a token
    // that stopped being refreshed because nobody was working has simply run
    // out, and this is the redirect that ends the session.
    const loginUrl = new URL("/adpnl/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Pushes the session's expiry back out to a full idle window.
 *
 * This request is itself the proof that someone is still working, so the
 * clock restarts. Re-signing on literally every request would mean a fresh
 * JWT for each image and RSC fetch, so a token is only reissued once it has
 * some age on it — the window is minutes, and the throttle is a minute.
 *
 * The window comes from the token rather than the database because this runs
 * on the edge. A change to the setting therefore reaches an open session at
 * its next sign-in; getAdminContext() enforces the current value in the
 * meantime.
 */
async function slideSession(
  req: NextRequest,
  payload: JWTPayload,
): Promise<NextResponse> {
  const res = NextResponse.next();

  const idleMinutes = typeof payload.idle === "number" ? payload.idle : null;
  const issuedAt = typeof payload.iat === "number" ? payload.iat : null;
  if (!idleMinutes || !issuedAt) return res;

  const ageSeconds = Date.now() / 1000 - issuedAt;
  if (ageSeconds < REFRESH_AFTER_SECONDS) return res;

  try {
    const { iat, exp, ...claims } = payload;
    void iat;
    void exp;
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${idleMinutes}m`)
      .sign(secretKey());

    const maxAge = idleMinutes * 60;
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    res.cookies.set(STAFF_MARKER_COOKIE, "1", {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  } catch {
    // A failed refresh is not a failed request: the existing token is still
    // valid, so let the admin through and try again on the next one.
  }

  return res;
}

export const config = {
  matcher: ["/adpnl/:path*"],
};
