import "server-only";
import { resolveCourierCredentials, CourierCredentials } from "@/lib/courier-credentials";

// Looks up a Bangladeshi phone number's delivery history across Pathao,
// RedX and Steadfast so the admin can spot a serial return/no-show before
// shipping. Pathao and RedX are ported from the flows each courier's own
// merchant dashboard uses (a login + bearer token; RedX's route is
// undocumented), so both are best-effort and can break if a courier changes
// its site. Steadfast uses its official, documented API with an API key and
// secret key instead.
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
        /** Steadfast only: fraud reports other merchants filed on this number. */
        fraudReports?: number;
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

// cancel defaults to "everything not delivered"; pass it when the courier
// reports cancellations itself, since its total may include parcels still
// on the way.
function buildStats(
  success: number,
  total: number,
  cancel = Math.max(total - success, 0),
): CourierResult {
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
// Official API: https://documenter.getpostman.com/view/26211192/2sAYJ1mhpk
// One GET with the two keys as headers — no login, no token. Never retried:
// Steadfast locks the account for 60 minutes after 10 failed attempts in 5,
// so after a key is rejected the next few minutes of checks answer from
// memory instead of spending more of those attempts.

const STEADFAST_API = "https://portal.packzy.com/api/v1";
const STEADFAST_REJECT_PAUSE_MS = 5 * 60_000;
let steadfastRejected: { until: number; message: string } | null = null;

function steadfastError(status: number, body: { attempts_left?: unknown; message?: unknown } | null): string {
  switch (status) {
    case 401: {
      const left =
        typeof body?.attempts_left === "number" ? ` ${body.attempts_left} attempts left before a 60-minute lockout.` : "";
      return `Steadfast rejected the API key or secret key.${left} Re-enter both and try again.`;
    }
    case 403:
      return "Steadfast refused access: the account is inactive or its verification (KYC) is incomplete.";
    case 404:
      return "Steadfast's fraud check address was not found (404). Their API may have changed.";
    case 429:
      return "Steadfast is rate-limiting this account. Try again in a minute.";
    default:
      return body?.message ? `Steadfast: ${body.message}` : `Steadfast returned an error (${status}).`;
  }
}

async function checkSteadfast(phone: string, creds: CourierCredentials): Promise<CourierResult> {
  const apiKey = creds.steadfastApiKey;
  const secretKey = creds.steadfastSecretKey;
  if (!apiKey || !secretKey) {
    return { status: false, message: "Steadfast credentials not configured." };
  }

  if (steadfastRejected) {
    if (Date.now() < steadfastRejected.until) return { status: false, message: steadfastRejected.message };
    steadfastRejected = null;
  }

  const res = await fetch(`${STEADFAST_API}/fraud_check/${phone}`, {
    headers: { "Api-Key": apiKey, "Secret-Key": secretKey, Accept: "application/json" },
    signal: timeoutSignal(),
    cache: "no-store",
  });
  const body = await safeJson(res);

  if (!res.ok) {
    const message = steadfastError(res.status, body);
    if (res.status === 401) steadfastRejected = { until: Date.now() + STEADFAST_REJECT_PAUSE_MS, message };
    return { status: false, message };
  }

  // A 200 that isn't the documented shape (an HTML page, a changed API)
  // must not read as "0 parcels, clean customer".
  if (typeof body?.total_parcels !== "number") {
    return { status: false, message: "Steadfast sent an unexpected reply." };
  }

  const stats = buildStats(
    Number(body.total_delivered) || 0,
    body.total_parcels,
    Number(body.total_cancelled) || 0,
  );
  if (stats.status && Array.isArray(body.total_fraud_reports)) {
    stats.data.fraudReports = body.total_fraud_reports.length;
  }
  return stats;
}

// ── Combined check ─────────────────────────────────────────────────
// Runs all three couriers in parallel (not sequential) so total latency is
// bounded by the slower call, not the sum, and wraps each in its own
// try/catch so one timing out or throwing never takes the other down.

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
