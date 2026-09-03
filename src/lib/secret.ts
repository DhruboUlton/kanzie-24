// Single source for the app's secrets, with one rule: never run on the
// hardcoded fallback in production. Deliberately NOT "server-only" — the
// edge middleware imports getSessionSecret too, and it only reads env and
// throws, so it is safe on the edge.

// Local-dev convenience only. In production a missing secret throws rather
// than silently signing sessions with a value that is in the source tree.
const DEV_FALLBACK = "kanzie-super-secure-admin-secret-key-32chars!";

function resolve(name: string, value: string | undefined, fallback: string): string {
  if (value && value.length > 0) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `FATAL: ${name} is not set. Refusing to run with a hardcoded fallback secret in production.`,
    );
  }
  return fallback;
}

/** HS256 signing key for the admin session JWT. */
export function getSessionSecret(): string {
  return resolve("ADMIN_SESSION_SECRET", process.env.ADMIN_SESSION_SECRET, DEV_FALLBACK);
}

/**
 * Key material for encrypting courier credentials at rest.
 *
 * Prefers a dedicated ENCRYPTION_KEY so rotating the session secret no longer
 * silently breaks stored credentials. Falls back to the session secret so
 * anything encrypted before this split still decrypts — set ENCRYPTION_KEY to
 * the current ADMIN_SESSION_SECRET value once, and the two are decoupled from
 * then on. The production fail-hard still applies through getSessionSecret().
 */
export function getEncryptionSecret(): string {
  const dedicated =
    process.env.ENCRYPTION_KEY || process.env.COURIER_CREDENTIALS_SECRET;
  if (dedicated && dedicated.length > 0) return dedicated;
  return getSessionSecret();
}
