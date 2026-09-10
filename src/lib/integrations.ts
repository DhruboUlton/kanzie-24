import { unstable_cache } from "next/cache";
import { SITE_CHROME_TAG } from "@/lib/cache-tags";
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

/**
 * Cached for the storefront shell, which renders on every page.
 *
 * Site-wide configuration: identical for every visitor, changed only from
 * the admin panel, and saveIntegrationsAction purges this the moment it is
 * saved. The admin panel keeps reading getEnabledIntegrations directly so an
 * editor always sees what they just wrote.
 */
export const getCachedEnabledIntegrations = unstable_cache(
  getEnabledIntegrations,
  ["site-chrome:integrations"],
  { revalidate: 1800, tags: [SITE_CHROME_TAG] },
);
