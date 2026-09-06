"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  BRAND_STRIP_ENABLED_KEY,
  BRAND_STRIP_KEY,
  BrandMark,
  BrandStripContent,
  MAX_BRAND_MARKS,
  MAX_BRAND_NAME_LENGTH,
  getBrandStrip,
  isBrandMarkStyle,
} from "@/lib/brand-strip";

export async function getBrandStripAction(): Promise<BrandStripContent> {
  await requirePermission("BANNER_VIEW");
  return getBrandStrip();
}

export async function updateBrandStripAction(
  content: BrandStripContent,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission("BANNER_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  // Re-validated here rather than trusted from the form: this writes JSON
  // that every homepage render will read back.
  const marks: BrandMark[] = [];
  for (const entry of Array.isArray(content?.marks) ? content.marks : []) {
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    if (!name) continue;
    if (name.length > MAX_BRAND_NAME_LENGTH) {
      return {
        success: false,
        error: `"${name.slice(0, 20)}…" is too long — keep names under ${MAX_BRAND_NAME_LENGTH} characters.`,
      };
    }
    marks.push({
      name,
      style: isBrandMarkStyle(entry?.style) ? entry.style : "display",
    });
  }

  if (marks.length > MAX_BRAND_MARKS) {
    return { success: false, error: `That is more than ${MAX_BRAND_MARKS} names.` };
  }

  try {
    for (const [key, value] of [
      [BRAND_STRIP_KEY, JSON.stringify(marks)],
      [BRAND_STRIP_ENABLED_KEY, content.enabled ? "true" : "false"],
    ] as const) {
      await db.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    await logActivity({
      actor: ctx,
      action: "BANNER_UPDATED",
      entityType: "BANNER",
      entityId: "brand-strip",
      description: `Updated the brand strip (${marks.length} ${marks.length === 1 ? "name" : "names"}${content.enabled ? "" : ", hidden"})`,
    });

    revalidatePath("/");
    revalidatePath("/admin/banner");
    return { success: true };
  } catch {
    return { success: false, error: "Couldn't save the brand strip." };
  }
}
