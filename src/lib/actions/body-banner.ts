"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizeHex } from "@/lib/hero";
import {
  BODY_BANNER_KEYS,
  BodyBannerContent,
  DEFAULT_BODY_BANNER,
  getBodyBannerContent,
} from "@/lib/body-banner";

export async function getBodyBannerContentAction(): Promise<BodyBannerContent> {
  await requireAdmin();
  return getBodyBannerContent();
}

export async function updateBodyBannerAction(
  content: BodyBannerContent,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const d = DEFAULT_BODY_BANNER;
  const values: Record<string, string> = {
    [BODY_BANNER_KEYS.eyebrow]: content.eyebrow.trim(),
    [BODY_BANNER_KEYS.headingLead]: content.headingLead.trim(),
    [BODY_BANNER_KEYS.headingAccent]: content.headingAccent.trim(),
    [BODY_BANNER_KEYS.subheading]: content.subheading.trim(),
    [BODY_BANNER_KEYS.headingColor]: normalizeHex(content.headingColor, d.headingColor),
    [BODY_BANNER_KEYS.headingAccentColor]: normalizeHex(
      content.headingAccentColor,
      d.headingAccentColor,
    ),
    [BODY_BANNER_KEYS.backgroundType]:
      content.backgroundType === "image" ? "image" : "color",
    [BODY_BANNER_KEYS.backgroundColor]: normalizeHex(
      content.backgroundColor,
      d.backgroundColor,
    ),
    [BODY_BANNER_KEYS.backgroundImage]: content.backgroundImage.trim(),
    [BODY_BANNER_KEYS.image]: content.image.trim(),
    [BODY_BANNER_KEYS.ctaLabel]: content.ctaLabel.trim(),
    [BODY_BANNER_KEYS.ctaHref]: content.ctaHref.trim() || "/products",
    [BODY_BANNER_KEYS.note]: content.note.trim(),
  };

  try {
    for (const [key, value] of Object.entries(values)) {
      await db.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/banner");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save body banner" };
  }
}
