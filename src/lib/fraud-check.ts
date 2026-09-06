import "server-only";
import { resolveCourierCredentials, CourierCredentials } from "@/lib/courier-credentials";

// Looks up a Bangladeshi phone number's delivery history across Pathao,
// RedX, and Steadfast — the three couriers customers most often place
// COD orders through — so the admin can spot a serial return/no-show
// before shipping. Ported from the merchant-panel flows each courier's
// own dashboard uses (there is no public "fraud check" API): Pathao is a
// real login + bearer-token endpoint, RedX is the same shape but against
// an undocumented internal admin route, and Steadfast has no API at all —
// it's a plain cookie-session login and an HTML/JSON scrape. All three are
// therefore best-effort and can break if a courier changes its site.
//
// Credentials are the store's own merchant account with each courier, not
// per-customer secrets — set via /adpnl/fraud-check (encrypted at rest,
// see src/lib/courier-credentials.ts) or matching env vars as a fallback.
// Any missing pair is reported as "not configured" for that courier only
// — the others still run.

const REQUEST_TIMEOUT_MS = 8000;
const TOKEN_CACHE_MINUTES = 50;

export type CourierResult =
  | {
      status: true;
      message: string;
      data: {
        success: number;
        cancel: number;
        total: number;
        deliveredPercentage: number;
        returnPercentage: number;
      };
    }
  | { status: false; message: string };

export type FraudCheckResult = {
  phone: string;
  pathao: CourierResult;
  redx: CourierResult;
  steadfast: CourierResult;
};

export class FraudCheckError extends Error {}

// ── Phone validation ──────────────────────────────────────────────
// Mirrors the reference implementation exactly: strip non-digits, drop a
// leading 880 country code, add back a leading 0 on a bare 10-digit
// "1XXXXXXXXX" number, then require 01[3-9] + 8 digits.

function normalizeBDPhoneNumber(phone: string): string {
  let digits = phone.replace(/\D+/g, "");
  if (digits.startsWith("880")) digits = digits.slice(3);
  if (digits.length === 10 && digits.startsWith("1")) digits = "0" + digits;
  return digits;
}

export function validateBDPhoneNumber(phone: string): string {
  const normalized = normalizeBDPhoneNumber(phone);
  if (!/^01[3-9][0-9]{8}$/.test(normalized)) {
    throw new FraudCheckError("Invalid Bangladeshi phone number.");
  }
  return normalized;
}

// ── Shared helpers ─────────────────────────────────────────────────

type CacheEntry = { value: unknown; expiresAt: number };
// Module-level, single-process cache standing in for Redis — resets on
// redeploy/restart, which just means the next check re-logs in. Fine for
// a low-volume admin tool; not a correctness issue.
const tokenCache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | null {
  const entry = tokenCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function cacheSet(key: string, value: unknown, minutes: number) {
  tokenCache.set(key, { value, expiresAt: Date.now() + minutes * 60_000 });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildStats(success: number, total: number): CourierResult {
  const cancel = Math.max(total - success, 0);
  return {
    status: true,
    message: "Successful.",
    data: {
      success,
      cancel,
      total,
      deliveredPercentage: total > 0 ? round2((success / total) * 100) : 0,
      returnPercentage: total > 0 ? round2((cancel / total) * 100) : 0,
    },
  };
}

async function safeJson(res: Response | null): Promise<any> {
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

// ── Pathao ─────────────────────────────────────────────────────────

async function getPathaoAccessToken(creds: CourierCredentials): Promise<string | null> {
  const cached = cacheGet<string>("pathao_access_token");
  if (cached) return cached;

  const username = creds.pathaoUser;
  const password = creds.pathaoPassword;
  if (!username || !password) return null;

  const res = await fetch("https://merchant.pathao.com/api/v1/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    signal: timeoutSignal(),
  });
  if (!res.ok) return null;

  const data = await safeJson(res);
  const token = typeof data?.access_token === "string" ? data.access_token.trim() : null;
  if (token) cacheSet("pathao_access_token", token, TOKEN_CACHE_MINUTES);
  return token;
}

async function checkPathao(phone: string, creds: CourierCredentials): Promise<CourierResult> {
  if (!creds.pathaoUser || !creds.pathaoPassword) {
    return { status: false, message: "Pathao credentials not configured." };
  }

  let token: string | null = null;
  for (let attempt = 0; attempt < 2 && !token; attempt++) {
    token = await getPathaoAccessToken(creds);
    if (!token) tokenCache.delete("pathao_access_token");
  }
  if (!token) return { status: false, message: "Authentication failed" };

  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch("https://merchant.pathao.com/api/v1/user/success", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone }),
      signal: timeoutSignal(),
    });
    if (res.ok) break;
  }

  if (!res || !res.ok) {
    const error = await safeJson(res);
    return { status: false, message: error?.message ?? "Unknown error occurred." };
  }

  const object = await safeJson(res);
  const customer = object?.data?.customer ?? {};
  return buildStats(Number(customer.successful_delivery) || 0, Number(customer.total_delivery) || 0);
}

// ── RedX ───────────────────────────────────────────────────────────
// RedX has no public API — this hits the same internal admin endpoint
// its own merchant dashboard calls, with headers spoofed to match a
// browser request from that dashboard.

const REDX_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Origin: "https://redx.com.bd",
  Referer: "https://redx.com.bd/",
};

async function getRedxAccessToken(creds: CourierCredentials): Promise<string | null> {
  const cached = cacheGet<string>("redx_access_token");
  if (cached) return cached;

  const redxPhone = creds.redxPhone;
  const redxPassword = creds.redxPassword;
  if (!redxPhone || !redxPassword) return null;

  const normalizedRedxPhone = validateBDPhoneNumber(redxPhone);

  const res = await fetch("https://api.redx.com.bd/v4/auth/login", {
    method: "POST",
    headers: { ...REDX_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ phone: `88${normalizedRedxPhone}`, password: redxPassword }),
    signal: timeoutSignal(),
  });
  if (!res.ok) return null;

  const data = await safeJson(res);
  const token = data?.data?.accessToken;
  if (typeof token === "string" && token) cacheSet("redx_access_token", token, TOKEN_CACHE_MINUTES);
  return typeof token === "string" ? token : null;
}

async function checkRedx(phone: string, creds: CourierCredentials): Promise<CourierResult> {
  if (!creds.redxPhone || !creds.redxPassword) {
    return { status: false, message: "RedX credentials not configured." };
  }

  let token: string | null = null;
  for (let attempt = 0; attempt < 2 && !token; attempt++) {
    token = await getRedxAccessToken(creds);
  }
  if (!token) return { status: false, message: "Login failed or unable to get access token" };

  const res = await fetch(
    `https://redx.com.bd/api/redx_se/admin/parcel/customer-success-return-rate?phoneNumber=88${phone}`,
    {
      headers: { ...REDX_HEADERS, "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: timeoutSignal(),
    },
  );

  if (res.ok) {
    const json = await safeJson(res);
    const data = json?.data ?? {};
    return buildStats(Number(data.deliveredParcels) || 0, Number(data.totalParcels) || 0);
  }

  if (res.status === 401) {
    tokenCache.delete("redx_access_token");
    return { status: false, message: "Access token expired or invalid. Please retry." };
  }

  const error = await safeJson(res);
  return { status: false, message: error?.message ?? "Unknown error occurred." };
}

// ── Steadfast ──────────────────────────────────────────────────────
// No API at all — this simulates a human login: fetch the login page,
// pull the CSRF token out of the HTML, POST the form, carry the session
// cookie, then hit the fraud-check page directly.

const STEADFAST_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

type CookieJar = Record<string, string>;

function parseSetCookies(res: Response): CookieJar {
  const jar: CookieJar = {};
  const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const raws = typeof getSetCookie === "function"
    ? getSetCookie.call(res.headers)
    : res.headers.get("set-cookie")
      ? [res.headers.get("set-cookie") as string]
      : [];

  for (const raw of raws) {
    const pair = raw.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) jar[name] = value;
  }
  return jar;
}

function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function loginSteadfast(creds: CourierCredentials): Promise<CookieJar | null> {
  const email = creds.steadfastUser;
  const password = creds.steadfastPassword;
  if (!email || !password) return null;

  const loginPage = await fetch("https://steadfast.com.bd/login", {
    headers: { "User-Agent": STEADFAST_UA },
    signal: timeoutSignal(),
  });
  const html = await loginPage.text();
  const token = html.match(/<input type="hidden" name="_token" value="(.*?)"/)?.[1];
  if (!token) return null;

  const initialCookies = parseSetCookies(loginPage);

  // Manual redirect so we can read the Set-Cookie header directly off the
  // login POST's response rather than following to whatever page it
  // points at — the cookies are what we need, not the destination.
  const loginRes = await fetch("https://steadfast.com.bd/login", {
    method: "POST",
    redirect: "manual",
    headers: {
      "User-Agent": STEADFAST_UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(initialCookies),
    },
    body: new URLSearchParams({ _token: token, email, password }).toString(),
    signal: timeoutSignal(),
  });

  // A redirect (successful login) or a fresh 200 both count as success,
  // mirroring the reference check of successful()||redirect().
  if (loginRes.status >= 400) return null;

  return { ...initialCookies, ...parseSetCookies(loginRes) };
}

async function logoutSteadfast(jar: CookieJar): Promise<void> {
  try {
    const res = await fetch("https://steadfast.com.bd/user/frauds/check", {
      headers: { "User-Agent": STEADFAST_UA, Cookie: cookieHeader(jar) },
      signal: timeoutSignal(),
    });
    if (!res.ok) return;
    const html = await res.text();
    const csrfToken = html.match(/<meta name="csrf-token" content="(.*?)"/)?.[1];
    if (!csrfToken) return;
    await fetch("https://steadfast.com.bd/logout", {
      method: "POST",
      headers: {
        "User-Agent": STEADFAST_UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieHeader(jar),
      },
      body: new URLSearchParams({ _token: csrfToken }).toString(),
      signal: timeoutSignal(),
    });
  } catch {
    // Best-effort cleanup only — a failed logout doesn't block the check.
  }
}

async function checkSteadfast(phone: string, creds: CourierCredentials): Promise<CourierResult> {
  if (!creds.steadfastUser || !creds.steadfastPassword) {
    return { status: false, message: "Steadfast credentials not configured." };
  }

  let jar = cacheGet<CookieJar>("steadfast_cookie");
  if (!jar) {
    jar = await loginSteadfast(creds);
    if (!jar) return { status: false, message: "Authentication failed" };
    cacheSet("steadfast_cookie", jar, TOKEN_CACHE_MINUTES);
  }

  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(`https://steadfast.com.bd/user/frauds/check/${phone}`, {
      headers: { "User-Agent": STEADFAST_UA, Cookie: cookieHeader(jar) },
      signal: timeoutSignal(),
    });
    if (res.ok) break;
  }

  if (!res || !res.ok) {
    tokenCache.delete("steadfast_cookie");
    const error = await safeJson(res);
    return { status: false, message: error?.message ?? "Unknown error occurred." };
  }

  const object = await safeJson(res);
  if (!object || Object.keys(object).length === 0) {
    await logoutSteadfast(jar);
    tokenCache.delete("steadfast_cookie");
    return { status: false, message: "Something went wrong. Try again" };
  }

  const success = Number(object.total_delivered) || 0;
  const cancel = Number(object.total_cancelled) || 0;
  return buildStats(success, success + cancel);
}

// ── Combined check ─────────────────────────────────────────────────
// Runs all three couriers in parallel (not sequential) so total latency
// is bounded by the slowest single call, not the sum of all three, and
// wraps each in its own try/catch so one timing out or throwing never
// takes the other two down with it.

async function safeCheck(fn: () => Promise<CourierResult>, label: string): Promise<CourierResult> {
  try {
    return await fn();
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? `${label} request timed out.`
        : err instanceof Error
          ? err.message
          : "Unknown error occurred.";
    return { status: false, message };
  }
}

export async function checkFraud(rawPhone: string): Promise<FraudCheckResult> {
  const phone = validateBDPhoneNumber(rawPhone);
  const creds = await resolveCourierCredentials();

  const [pathao, redx, steadfast] = await Promise.all([
    safeCheck(() => checkPathao(phone, creds), "Pathao"),
    safeCheck(() => checkRedx(phone, creds), "RedX"),
    safeCheck(() => checkSteadfast(phone, creds), "Steadfast"),
  ]);

  return { phone, pathao, redx, steadfast };
}
