"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
  await requireAdmin();

  try {
    for (const [key, value] of Object.entries(settings)) {
      await db.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update settings" };
  }
}
