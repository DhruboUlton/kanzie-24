import "server-only";
import crypto from "crypto";

// Encrypts merchant credentials (courier passwords, etc.) before they're
// stored in SiteSetting — that table is otherwise plain text, and these
// are real third-party login passwords, not display copy. Key is derived
// from ADMIN_SESSION_SECRET so there's no separate secret to provision;
// same fallback string as auth.ts for local dev without a .env.local.
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret =
    process.env.ADMIN_SESSION_SECRET || "kanzie-super-secure-admin-secret-key-32chars!";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
