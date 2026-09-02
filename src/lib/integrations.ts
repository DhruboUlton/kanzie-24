import "server-only";
import { db } from "@/lib/db";
import {
  INTEGRATIONS_SETTING_KEY,
  Integration,
  parseIntegrations,
} from "@/lib/integrations-shared";

export async function getIntegrations(): Promise<Integration[]> {
  try {
    const row = await db.siteSetting.findUnique({
      where: { key: INTEGRATIONS_SETTING_KEY },
    });
    return parseIntegrations(row?.value);
  } catch {
    // The storefront renders without trackers rather than not at all.
    return [];
  }
}

export async function getEnabledIntegrations(): Promise<Integration[]> {
  return (await getIntegrations()).filter((i) => i.enabled && i.code.trim());
}
