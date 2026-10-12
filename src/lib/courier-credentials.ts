import "server-only";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

// Where each courier's merchant login lives: SiteSetting row if the admin
// has entered one through /adpnl/fraud-check, otherwise the matching env
// var (so an env-only deployment keeps working exactly as before this UI
// existed). Passwords are encrypted before they hit the database — see
// src/lib/crypto.ts.
export const CREDENTIAL_KEYS = {
  pathaoUser: "courier_pathao_user",
  pathaoPassword: "courier_pathao_password",
  redxPhone: "courier_redx_phone",
  redxPassword: "courier_redx_password",
  // Steadfast's official API keys. New names on purpose: the old
  // courier_steadfast_user/_password rows held a panel login and are never read.
  steadfastApiKey: "courier_steadfast_api_key",
  steadfastSecretKey: "courier_steadfast_secret_key",
} as const;

export type CourierCredentials = {
  pathaoUser?: string;
  pathaoPassword?: string;
  redxPhone?: string;
  redxPassword?: string;
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
};

export type CourierCredentialsStatus = {
  pathao: { user: string; hasPassword: boolean };
  redx: { phone: string; hasPassword: boolean };
  steadfast: { hasApiKey: boolean; hasSecretKey: boolean };
};

async function readStoredSettings(): Promise<Record<string, string>> {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: Object.values(CREDENTIAL_KEYS) } },
    });
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    return map;
  } catch {
    // DB not connected — every lookup falls back to its env var.
    return {};
  }
}

function resolveField(
  stored: Record<string, string>,
  key: string,
  envVar: string,
  encrypted: boolean,
): string | undefined {
  const raw = stored[key];
  if (raw && !encrypted) return raw;
  if (raw) {
    try {
      return decrypt(raw);
    } catch {
      // Encrypted under a different key than this server derives — a local
      // preview reading the live database, or a rotated ENCRYPTION_KEY. One
      // unreadable value used to take the whole fraud-check page down; now
      // it reads as not set, and says why in the log.
      console.warn(`Courier credential "${key}" doesn't decrypt with this server's key; re-save it.`);
    }
  }
  return process.env[envVar] || undefined;
}

export async function resolveCourierCredentials(): Promise<CourierCredentials> {
  const stored = await readStoredSettings();
  return {
    pathaoUser: resolveField(stored, CREDENTIAL_KEYS.pathaoUser, "PATHAO_USER", false),
    pathaoPassword: resolveField(stored, CREDENTIAL_KEYS.pathaoPassword, "PATHAO_PASSWORD", true),
    redxPhone: resolveField(stored, CREDENTIAL_KEYS.redxPhone, "REDX_PHONE", false),
    redxPassword: resolveField(stored, CREDENTIAL_KEYS.redxPassword, "REDX_PASSWORD", true),
    steadfastApiKey: resolveField(stored, CREDENTIAL_KEYS.steadfastApiKey, "STEADFAST_API_KEY", true),
    steadfastSecretKey: resolveField(stored, CREDENTIAL_KEYS.steadfastSecretKey, "STEADFAST_SECRET_KEY", true),
  };
}

export async function getCourierCredentialsStatus(): Promise<CourierCredentialsStatus> {
  const creds = await resolveCourierCredentials();
  return {
    pathao: { user: creds.pathaoUser || "", hasPassword: !!creds.pathaoPassword },
    redx: { phone: creds.redxPhone || "", hasPassword: !!creds.redxPassword },
    steadfast: { hasApiKey: !!creds.steadfastApiKey, hasSecretKey: !!creds.steadfastSecretKey },
  };
}

// A blank username/phone field clears it. A blank password or key field means
// "leave unchanged" — the saved password is never sent back to the
// client, so it can't round-trip one; only a non-empty value overwrites
// what's stored.
export async function saveCourierCredentials(input: CourierCredentials): Promise<void> {
  const writes: [string, string][] = [];

  if (input.pathaoUser !== undefined) writes.push([CREDENTIAL_KEYS.pathaoUser, input.pathaoUser]);
  if (input.pathaoPassword) writes.push([CREDENTIAL_KEYS.pathaoPassword, encrypt(input.pathaoPassword)]);
  if (input.redxPhone !== undefined) writes.push([CREDENTIAL_KEYS.redxPhone, input.redxPhone]);
  if (input.redxPassword) writes.push([CREDENTIAL_KEYS.redxPassword, encrypt(input.redxPassword)]);
  if (input.steadfastApiKey) writes.push([CREDENTIAL_KEYS.steadfastApiKey, encrypt(input.steadfastApiKey.trim())]);
  if (input.steadfastSecretKey) writes.push([CREDENTIAL_KEYS.steadfastSecretKey, encrypt(input.steadfastSecretKey.trim())]);

  for (const [key, value] of writes) {
    await db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
