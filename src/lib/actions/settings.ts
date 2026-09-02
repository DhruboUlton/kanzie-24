"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function getSettingsMap(): Promise<Record<string, string>> {
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

export async function updateSettingsAction(settings: Record<string, string>) {
  let ctx;
  try {
    ctx = await requirePermission("SETTINGS_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
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
      metadata: { keys: Object.keys(settings) },
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
