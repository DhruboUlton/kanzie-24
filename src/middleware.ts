import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "kanzie_admin_session";
const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || "kanzie-super-secure-admin-secret-key-32chars!"
);

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      // If already logged in, redirect to /admin dashboard
      const token = req.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        try {
          await jwtVerify(token, SECRET_KEY);
          return NextResponse.redirect(new URL("/admin", req.url));
        } catch {
          // Token invalid, allow login page
        }
      }
      return NextResponse.next();
    }

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
