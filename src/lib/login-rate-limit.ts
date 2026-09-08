import "server-only";
import { headers } from "next/headers";

/**
 * Failed-sign-in throttle for the admin login.
 *
 * In-memory and per-process — the same trade as the order-tracking throttle
 * in src/lib/actions/track.ts, and stated plainly for the same reason: it
 * resets on redeploy and does not span instances. That is deliberate. The
 * alternative is a database write per failed attempt, which would turn a
 * brute-force attempt into a flood against the one resource this store
 * cannot spare. This raises the cost of guessing a password from free to
 * slow; it is not a defence against an attack spread over many addresses.
 *
 * Worth knowing: a Cloudflare rule cannot do this job here, because the
 * origin answers directly on its own IP. Only the application sees every
 * request regardless of the path it took.
 */

const WINDOW_MS = 15 * 60_000;

// Two limits, because they answer different questions.
//
// The email limit is the real control: it caps what any single account is
// exposed to, no matter how many machines are guessing at it.
//
// The IP limit catches one machine working through many accounts. It is
// loose on purpose — ISPs here put many subscribers behind a single public
// address, so a tight per-IP rule punishes bystanders for a stranger's
// typing. The email limit trips first for any real person.
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

type Entry = { count: number; resetAt: number };

const failures = new Map<string, Entry>();

export type LoginThrottle =
  | { blocked: false }
  | { blocked: true; retryAfterMinutes: number };

/** The client's address, or null when it cannot be established. */
export async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for")?.split(",")[0].trim();
    return forwarded || h.get("x-real-ip") || null;
  } catch {
    return null;
  }
}

function emailKey(email: string) {
  return `e:${email}`;
}

function ipKey(ip: string) {
  return `i:${ip}`;
}

/** Milliseconds left on a key's block, or 0 if it is not blocking. */
function blockedFor(key: string, max: number, now: number): number {
  const entry = failures.get(key);
  if (!entry || now > entry.resetAt) return 0;
  return entry.count >= max ? entry.resetAt - now : 0;
}

function bump(key: string, now: number) {
  const entry = failures.get(key);
  if (!entry || now > entry.resetAt) {
    // A fixed window measured from the first failure, not a sliding one:
    // hammering the form does not extend your own lockout, which keeps the
    // worst case for someone who simply forgot their password bounded at
    // WINDOW_MS rather than "however long they keep trying".
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

/** Opportunistic, so the map cannot grow without bound. */
function sweep(now: number) {
  if (failures.size <= 5000) return;
  for (const [key, entry] of failures) {
    if (now > entry.resetAt) failures.delete(key);
  }
}

/**
 * Whether this attempt should be refused before it costs anything.
 *
 * Call before the account lookup and before bcrypt, so a flood of guesses
 * costs a map lookup rather than a database round trip and an 80ms hash.
 */
export function checkLoginThrottle(
  email: string,
  ip: string | null,
): LoginThrottle {
  const now = Date.now();
  const waits = [blockedFor(emailKey(email), MAX_PER_EMAIL, now)];
  // No address, no per-address limit. Bucketing every unidentifiable
  // request together would let one of them lock out all the others.
  if (ip) waits.push(blockedFor(ipKey(ip), MAX_PER_IP, now));

  const wait = Math.max(...waits);
  if (wait <= 0) return { blocked: false };
  return { blocked: true, retryAfterMinutes: Math.max(1, Math.ceil(wait / 60_000)) };
}

/** Record a wrong password, a missing account, or a disabled one. */
export function recordLoginFailure(email: string, ip: string | null) {
  const now = Date.now();
  bump(emailKey(email), now);
  if (ip) bump(ipKey(ip), now);
  sweep(now);
}

/**
 * Clear an account's failures after it signs in successfully.
 *
 * Only the email key. The address keeps its tally on purpose: someone who
 * holds one valid account should not be able to reset the budget that
 * exists to notice a single machine working through the others. A real
 * admin never reaches the address limit anyway, because the email limit
 * stops them four attempts earlier.
 */
export function clearLoginFailures(email: string) {
  failures.delete(emailKey(email));
}

/** Test seam. Not called by application code. */
export function __resetLoginThrottle() {
  failures.clear();
}
