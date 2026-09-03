"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function getSettingsMap(): Promise<Record<string, string>> {
  // Exported from a "use server" module, so Next registers it as an
  // invokable action even though only the settings page calls it. Gate it,
  // or it hands the whole SiteSetting table — courier usernames and phones
  // included — to anyone who can reach the action. The page that uses it
  // already holds this permission, so the guard is invisible there.
  await requirePermission("SETTINGS_VIEW");

  try {
    const records = await db.siteSetting.findMany();
    const map: Record<string, string> = {};
    for (const r of records) {
      map[r.key] = r.value;
    }
    return map;
  } catch {
    return {
      announcement_text: "Free shipping across Bangladesh on orders over ৳5,000",
      announcement_enabled: "true",
      contact_phone: "+880 1700-000000",
      contact_email: "support@kanzie.com",
    };
  }
}

// The only keys this action may touch. SiteSetting is one flat key/value
// table shared by every feature, and SETTINGS_MANAGE must not become a skeleton
// key to all of it: the integrations blob is script that runs on the storefront
// and is gated far more strictly (INTEGRATIONS_MANAGE + owner/manager), the
// courier_* rows are encrypted credentials, and the hero_*/banner/*_stock keys
// belong to BANNER_MANAGE and INVENTORY_ADJUST. Anything not listed here is
// dropped, so this action can only ever write the store-settings screen's own
// fields no matter what the client posts.
const ALLOWED_SETTING_KEYS = new Set([
  "announcement_text",
  "announcement_enabled",
  "contact_phone",
  "contact_email",
  "site_tab_title",
  "site_tab_tagline",
  "site_favicon",
]);

export async function updateSettingsAction(settings: Record<string, string>) {
  let ctx;
  try {
    ctx = await requirePermission("SETTINGS_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const entries = Object.entries(settings).filter(([key]) =>
    ALLOWED_SETTING_KEYS.has(key),
  );
  if (entries.length === 0) {
    return { success: false, error: "No editable settings in that request." };
  }

  try {
    for (const [key, value] of entries) {
      await db.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    await logActivity({
      actor: ctx,
      action: "SETTINGS_UPDATED",
      entityType: "SETTINGS",
      description: "Updated store settings",
      metadata: { keys: entries.map(([key]) => key) },
    });

    // "layout" scope so the root layout's generateMetadata re-runs — the tab
    // title and favicon live there, and a plain page revalidate misses them.
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: any) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    console.error("updateSettings error:", error);
    return { success: false, error: "Couldn't save the settings." };
  }
}
