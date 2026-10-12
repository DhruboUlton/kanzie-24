"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { normalizeCtaHref } from "@/lib/hero";
import { REELS_KEYS as k, MAX_REELS, Reel, ReelsContent, getReels } from "@/lib/reels";

export async function getReelsAction(): Promise<ReelsContent> {
  await requirePermission("BANNER_VIEW");
  return getReels();
}

export async function updateReelsAction(
  content: ReelsContent,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission("BANNER_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  // Re-validated here rather than trusted from the form: the video becomes a
  // src and the link an href on every homepage render, so both get the same
  // same-origin-path-or-http(s) check; anything else is dropped.
  const reels: Reel[] = [];
  for (const entry of Array.isArray(content?.reels) ? content.reels : []) {
    const video = normalizeCtaHref(entry?.video, "");
    if (video) reels.push({ video, href: normalizeCtaHref(entry?.href, "") });
  }
  if (reels.length > MAX_REELS) {
    return { success: false, error: `That is more than ${MAX_REELS} reels.` };
  }

  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const values: Record<string, string> = {
    [k.heading]: text(content?.heading, 80),
    [k.subheading]: text(content?.subheading, 200),
    [k.handle]: text(content?.handle, 40),
    [k.followUrl]: normalizeCtaHref(content?.followUrl, ""),
    [k.items]: JSON.stringify(reels),
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
      entityId: "reels",
      description: `Updated the reels (${reels.length} ${reels.length === 1 ? "clip" : "clips"})`,
    });

    revalidatePath("/");
    revalidatePath("/adpnl/banner");
    return { success: true };
  } catch {
    return { success: false, error: "Couldn't save the reels." };
  }
}
