"use server";

import { revalidatePath, updateTag } from "next/cache";
import { SITE_CHROME_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  POPUP_KEY,
  PopupConfig,
  getPopupConfig,
  sanitizePopupConfig,
} from "@/lib/popup";

const VIEW = "POPUP_VIEW" as const;
const MANAGE = "POPUP_MANAGE" as const;

export async function getPopupConfigAction(): Promise<
  { success: true; config: PopupConfig } | { success: false; error: string }
> {
  try {
    await requirePermission(VIEW);
  } catch (error) {
    return (
      authErrorResult(error) ?? {
        success: false,
        error: "Not allowed to view popup settings.",
      }
    );
  }

  const config = await getPopupConfig();
  return { success: true, config };
}

export async function updatePopupConfigAction(
  data: PopupConfig,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission(MANAGE);
  } catch (error) {
    return (
      authErrorResult(error) ?? {
        success: false,
        error: "Not allowed to edit popup settings.",
      }
    );
  }

  const clean = sanitizePopupConfig(data);

  if (clean.enabled && !clean.title.trim()) {
    return { success: false, error: "Popup title cannot be blank when enabled." };
  }

  // A live popup must not advertise a code that will fail at checkout. The
  // shipped sample content named one that had never been created, so anyone
  // who simply switched the popup on would have handed every visitor a
  // discount the till would reject.
  if (clean.enabled && clean.couponCode) {
    try {
      const coupon = await db.coupon.findUnique({
        where: { code: clean.couponCode },
        select: { isActive: true },
      });
      if (!coupon) {
        return {
          success: false,
          error: `No coupon called ${clean.couponCode} exists. Create it under Coupons first, or clear the code.`,
        };
      }
      if (!coupon.isActive) {
        return {
          success: false,
          error: `The coupon ${clean.couponCode} is switched off, so customers could not use it.`,
        };
      }
    } catch (error) {
      console.error("Popup coupon check failed:", error);
      return { success: false, error: "Couldn't check that coupon. Please try again." };
    }
  }

  try {
    const value = JSON.stringify(clean);

    await db.siteSetting.upsert({
      where: { key: POPUP_KEY },
      update: { value },
      create: { key: POPUP_KEY, value },
    });

    await logActivity({
      actor: ctx,
      action: "POPUP_UPDATED",
      entityType: "POPUP",
      entityId: "storefront_popup",
      description: `Updated storefront pop up settings (${clean.enabled ? "enabled" : "disabled"})`,
      metadata: {
        enabled: clean.enabled,
        title: clean.title,
        couponCode: clean.couponCode || null,
        targetPages: clean.targetPages,
      },
    });

    // The popup is mounted in the storefront layout, so every page under it
    // has to be refreshed — including product pages, which are prerendered
    // and would otherwise keep the old popup until their revalidate window
    // lapsed. "/(storefront)" matched no layout file: the documented
    // route-group form needs a route after the group, and this is what the
    // rest of the codebase already uses to purge everything.
    revalidatePath("/", "layout");
    updateTag(SITE_CHROME_TAG);
    revalidatePath("/adpnl/popup");

    return { success: true };
  } catch (error) {
    // Logged, not returned: a Prisma failure carries schema and connection
    // detail that has no business reaching a browser.
    console.error("Save popup error:", error);
    return { success: false, error: "Couldn't save the popup. Please try again." };
  }
}
