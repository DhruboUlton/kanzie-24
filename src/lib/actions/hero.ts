"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { HERO_KEYS, HeroContent, getHeroContent } from "@/lib/hero";

export async function getHeroContentAction(): Promise<HeroContent> {
  await requireAdmin();
  return getHeroContent();
}

export async function updateHeroAction(
  content: HeroContent,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  if (content.slides.length === 0) {
    return { success: false, error: "Add at least one slide image." };
  }

  const values: Record<string, string> = {
    [HERO_KEYS.headingLead]: content.headingLead.trim(),
    [HERO_KEYS.headingAccent]: content.headingAccent.trim(),
    [HERO_KEYS.headingTail]: content.headingTail.trim(),
    [HERO_KEYS.subheading]: content.subheading.trim(),
    [HERO_KEYS.ctaLabel]: content.ctaLabel.trim(),
    [HERO_KEYS.ctaHref]: content.ctaHref.trim() || "/products",
    [HERO_KEYS.slides]: JSON.stringify(
      content.slides
        .filter((s) => s.src.trim())
        .map((s) => ({
          src: s.src.trim(),
          alt: s.alt.trim(),
          groundOffset: Number(s.groundOffset) || 0,
          leftGap: Number(s.leftGap) || 0,
          rightGap: Number(s.rightGap) || 0,
        })),
    ),
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
    return { success: false, error: error?.message || "Failed to save banner" };
  }
}
