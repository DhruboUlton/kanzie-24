import "server-only";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

// Where each courier's merchant login lives: SiteSetting row if the admin
// has entered one through /admin/fraud-check, otherwise the matching env
// var (so an env-only deployment keeps working exactly as before this UI
// existed). Passwords are encrypted before they hit the database — see
// src/lib/crypto.ts.
export const CREDENTIAL_KEYS = {
  pathaoUser: "courier_pathao_user",
  pathaoPassword: "courier_pathao_password",
  redxPhone: "courier_redx_phone",
  redxPassword: "courier_redx_password",
  steadfastUser: "courier_steadfast_user",
  steadfastPassword: "courier_steadfast_password",
} as const;

export type CourierCredentials = {
  pathaoUser?: string;
  pathaoPassword?: string;
  redxPhone?: string;
  redxPassword?: string;
  steadfastUser?: string;
  steadfastPassword?: string;
};

export type CourierCredentialsStatus = {
  pathao: { user: string; hasPassword: boolean };
  redx: { phone: string; hasPassword: boolean };
  steadfast: { user: string; hasPassword: boolean };
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
  if (raw) return encrypted ? decrypt(raw) : raw;
  return process.env[envVar] || undefined;
}

export async function resolveCourierCredentials(): Promise<CourierCredentials> {
  const stored = await readStoredSettings();
  return {
    pathaoUser: resolveField(stored, CREDENTIAL_KEYS.pathaoUser, "PATHAO_USER", false),
    pathaoPassword: resolveField(stored, CREDENTIAL_KEYS.pathaoPassword, "PATHAO_PASSWORD", true),
    redxPhone: resolveField(stored, CREDENTIAL_KEYS.redxPhone, "REDX_PHONE", false),
    redxPassword: resolveField(stored, CREDENTIAL_KEYS.redxPassword, "REDX_PASSWORD", true),
    steadfastUser: resolveField(stored, CREDENTIAL_KEYS.steadfastUser, "STEADFAST_USER", false),
    steadfastPassword: resolveField(
      stored,
      CREDENTIAL_KEYS.steadfastPassword,
      "STEADFAST_PASSWORD",
      true,
    ),
  };
}

export async function getCourierCredentialsStatus(): Promise<CourierCredentialsStatus> {
  const creds = await resolveCourierCredentials();
  return {
    pathao: { user: creds.pathaoUser || "", hasPassword: !!creds.pathaoPassword },
    redx: { phone: creds.redxPhone || "", hasPassword: !!creds.redxPassword },
    steadfast: { user: creds.steadfastUser || "", hasPassword: !!creds.steadfastPassword },
  };
}

// A blank username/phone field clears it. A blank password field means
// "leave unchanged" — the saved password is never sent back to the
// client, so it can't round-trip one; only a non-empty value overwrites
// what's stored.
export async function saveCourierCredentials(input: CourierCredentials): Promise<void> {
  const writes: [string, string][] = [];

  if (input.pathaoUser !== undefined) writes.push([CREDENTIAL_KEYS.pathaoUser, input.pathaoUser]);
  if (input.pathaoPassword) writes.push([CREDENTIAL_KEYS.pathaoPassword, encrypt(input.pathaoPassword)]);
  if (input.redxPhone !== undefined) writes.push([CREDENTIAL_KEYS.redxPhone, input.redxPhone]);
  if (input.redxPassword) writes.push([CREDENTIAL_KEYS.redxPassword, encrypt(input.redxPassword)]);
  if (input.steadfastUser !== undefined)
    writes.push([CREDENTIAL_KEYS.steadfastUser, input.steadfastUser]);
  if (input.steadfastPassword)
    writes.push([CREDENTIAL_KEYS.steadfastPassword, encrypt(input.steadfastPassword)]);

  for (const [key, value] of writes) {
    await db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
