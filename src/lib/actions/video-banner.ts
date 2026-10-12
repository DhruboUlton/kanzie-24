"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { normalizeCtaHref, clampOverlay } from "@/lib/hero";
import {
  VIDEO_BANNER_KEYS as k,
  VideoBannerContent,
  getVideoBanner,
} from "@/lib/video-banner";

export async function getVideoBannerAction(): Promise<VideoBannerContent> {
  await requirePermission("BANNER_VIEW");
  return getVideoBanner();
}

export async function updateVideoBannerAction(
  content: VideoBannerContent,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission("BANNER_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  // Both URLs reach the storefront as a src, so they get the same
  // same-origin-path-or-http(s) check as a link; anything else is dropped.
  const values: Record<string, string> = {
    [k.video]: normalizeCtaHref(content.video, ""),
    [k.poster]: normalizeCtaHref(content.poster, ""),
    [k.heading]: content.heading.trim(),
    [k.subheading]: content.subheading.trim(),
    [k.ctaLabel]: content.ctaLabel.trim(),
    [k.ctaHref]: normalizeCtaHref(content.ctaHref, "/products"),
    [k.overlay]: String(clampOverlay(content.overlay)),
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
      entityId: "video",
      description: "Updated the video banner",
    });

    revalidatePath("/");
    revalidatePath("/adpnl/banner");
    return { success: true };
  } catch {
    return { success: false, error: "Couldn't save the video banner." };
  }
}
