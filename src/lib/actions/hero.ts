"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  DEFAULT_BANNER_SLIDE,
  DEFAULT_HERO,
  HERO_KEYS,
  HeroContent,
  getHeroContent,
  normalizeHex,
  normalizeCtaHref,
  normalizeMode,
  normalizeAlign,
  clampOverlay,
  clampZoom,
} from "@/lib/hero";

export async function getHeroContentAction(): Promise<HeroContent> {
  await requirePermission("BANNER_VIEW");
  return getHeroContent();
}

export async function updateHeroAction(
  content: HeroContent,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission("BANNER_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const mode = normalizeMode(content.mode);
  const bannerSlides = content.bannerSlides.filter((s) => s.src.trim());

  // Only the active mode has to be complete — the other one's setup is
  // still stored, it just isn't what the homepage is showing.
  if (mode === "coverflow" && content.slides.length === 0) {
    return { success: false, error: "Add at least one slide image." };
  }
  if (mode === "banner" && bannerSlides.length === 0) {
    return {
      success: false,
      error: "Add at least one banner image, or switch back to the slider.",
    };
  }

  const values: Record<string, string> = {
    [HERO_KEYS.mode]: mode,
    [HERO_KEYS.headingLead]: content.headingLead.trim(),
    [HERO_KEYS.headingAccent]: content.headingAccent.trim(),
    [HERO_KEYS.headingTail]: content.headingTail.trim(),
    [HERO_KEYS.subheading]: content.subheading.trim(),
    [HERO_KEYS.headingColor]: normalizeHex(
      content.headingColor,
      DEFAULT_HERO.headingColor,
    ),
    [HERO_KEYS.headingAccentColor]: normalizeHex(
      content.headingAccentColor,
      DEFAULT_HERO.headingAccentColor,
    ),
    [HERO_KEYS.backgroundColor]: normalizeHex(
      content.backgroundColor,
      DEFAULT_HERO.backgroundColor,
    ),
    [HERO_KEYS.watermarkColor]: normalizeHex(
      content.watermarkColor,
      DEFAULT_HERO.watermarkColor,
    ),
    [HERO_KEYS.ctaLabel]: content.ctaLabel.trim(),
    [HERO_KEYS.ctaHref]: normalizeCtaHref(content.ctaHref, "/products"),
    [HERO_KEYS.slides]: JSON.stringify(
      content.slides
        .filter((s) => s.src.trim())
        .map((s) => ({
          src: s.src.trim(),
          alt: s.alt.trim(),
          groundOffset: Number(s.groundOffset) || 0,
          leftGap: Number(s.leftGap) || 0,
          rightGap: Number(s.rightGap) || 0,
          zoom: clampZoom(s.zoom),
          word: s.word.trim(),
        })),
    ),
    [HERO_KEYS.bannerSlides]: JSON.stringify(
      bannerSlides.map((s) => ({
        src: s.src.trim(),
        alt: s.alt.trim(),
        heading: s.heading.trim(),
        subheading: s.subheading.trim(),
        ctaLabel: s.ctaLabel.trim(),
        // Kept empty rather than defaulted so a slide with no button
        // doesn't quietly acquire a destination it never asked for.
        ctaHref: normalizeCtaHref(s.ctaHref, ""),
        align: normalizeAlign(s.align),
        textColor: normalizeHex(s.textColor, DEFAULT_BANNER_SLIDE.textColor),
        overlay: clampOverlay(s.overlay),
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

    await logActivity({
      actor: ctx,
      action: "BANNER_UPDATED",
      entityType: "BANNER",
      entityId: "hero",
      description: `Updated the hero banner (${mode} style)`,
      metadata: { mode, slides: content.slides.length, bannerSlides: bannerSlides.length },
    });

    revalidatePath("/");
    revalidatePath("/admin/banner");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save banner" };
  }
}
