"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  TESTIMONIALS_KEY,
  Testimonial,
  getTestimonials,
  normalizeAvatar,
  MAX_NAME,
  MAX_ROLE,
  MAX_QUOTE,
  MAX_TESTIMONIALS,
} from "@/lib/testimonials";

// Gated on the reviews permissions themselves, not on whoever happens to
// hold a neighbouring one. This used to accept SETTINGS_* or BANNER_*, which
// had it backwards twice over: a role granted REVIEWS_MANAGE and nothing else
// was refused by the very feature that permission names, while anyone with
// BANNER_MANAGE could edit reviews without being given the right to.
//
// requirePermission throws ForbiddenError/UnauthenticatedError, which
// authErrorResult() knows how to turn into a result — a plain Error does not
// convert, and reached the caller as an unhandled throw.
const VIEW = "REVIEWS_VIEW" as const;
const MANAGE = "REVIEWS_MANAGE" as const;

/** Trim and cap one field to what the storage row can actually hold. */
function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Reviews for the admin screen.
 *
 * The page reads the list directly through getTestimonials() after its own
 * permission check; this exists for any client caller that needs to refresh.
 */
export async function getTestimonialsAction(): Promise<
  { success: true; testimonials: Testimonial[] } | { success: false; error: string }
> {
  try {
    await requirePermission(VIEW);
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed to view reviews." };
  }
  return { success: true, testimonials: await getTestimonials(false) };
}

/** Replace the stored list, and refresh both places that render it. */
async function persist(list: Testimonial[]) {
  const value = JSON.stringify(list);
  await db.siteSetting.upsert({
    where: { key: TESTIMONIALS_KEY },
    update: { value },
    create: { key: TESTIMONIALS_KEY, value },
  });
  revalidatePath("/");
  revalidatePath("/adpnl/reviews");
}

export async function saveTestimonialAction(
  item: Omit<Testimonial, "id" | "createdAt"> & { id?: string },
): Promise<{ success: boolean; error?: string; testimonial?: Testimonial }> {
  let ctx;
  try {
    ctx = await requirePermission(MANAGE);
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed to modify reviews." };
  }

  const name = clip(item.name, MAX_NAME);
  const quote = clip(item.quote, MAX_QUOTE);
  if (!name) return { success: false, error: "Reviewer name is required." };
  if (!quote) return { success: false, error: "Review quote content is required." };

  // Left blank on purpose is fine — the carousel falls back to the
  // reviewer's initial. A value that was typed but points off-site is
  // refused rather than quietly corrected, so an admin who pastes an
  // external URL is told why it will not work instead of finding a broken
  // circle on the storefront later.
  const typedAvatar = typeof item.avatar === "string" ? item.avatar.trim() : "";
  const avatar = typedAvatar ? normalizeAvatar(typedAvatar) : "";
  if (avatar === null) {
    return {
      success: false,
      error:
        "Pick an image from the media library, or use a path on this site (starting with /). Leave it empty to show the reviewer's initial.",
    };
  }

  try {
    const current = await getTestimonials(false);
    const fields = {
      name,
      quote,
      role: clip(item.role, MAX_ROLE),
      avatar,
      rating: Math.max(1, Math.min(5, Math.round(Number(item.rating)) || 5)),
      isActive: item.isActive !== false,
    };

    let updatedList: Testimonial[];
    let savedItem: Testimonial;

    if (item.id) {
      const existingIdx = current.findIndex((t) => t.id === item.id);
      if (existingIdx === -1) return { success: false, error: "Review not found." };
      savedItem = { ...current[existingIdx], ...fields };
      updatedList = [...current];
      updatedList[existingIdx] = savedItem;
    } else {
      // Capped because the whole list shares one TEXT column; past this it
      // stops being a carousel and starts being a truncation bug.
      if (current.length >= MAX_TESTIMONIALS) {
        return {
          success: false,
          error: `You can keep up to ${MAX_TESTIMONIALS} reviews. Delete one before adding another.`,
        };
      }
      savedItem = {
        id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...fields,
        createdAt: new Date().toISOString(),
      };
      // Added to the front so a new review is immediately visible.
      updatedList = [savedItem, ...current];
    }

    await persist(updatedList);
    await logActivity({
      actor: ctx,
      action: item.id ? "REVIEW_UPDATED" : "REVIEW_CREATED",
      entityType: "REVIEW",
      entityId: savedItem.id,
      description: `${item.id ? "Updated" : "Added"} customer review by ${savedItem.name}`,
    });

    return { success: true, testimonial: savedItem };
  } catch (error) {
    // Logged, not returned: a Prisma failure carries schema and connection
    // detail that has no business reaching a browser.
    console.error("Save review error:", error);
    return { success: false, error: "Couldn't save the review. Please try again." };
  }
}

export async function deleteTestimonialAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission(MANAGE);
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed to delete reviews." };
  }

  try {
    const current = await getTestimonials(false);
    const target = current.find((t) => t.id === id);
    if (!target) return { success: false, error: "Review not found." };

    await persist(current.filter((t) => t.id !== id));
    await logActivity({
      actor: ctx,
      action: "REVIEW_DELETED",
      entityType: "REVIEW",
      entityId: id,
      description: `Deleted customer review from ${target.name}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Delete review error:", error);
    return { success: false, error: "Couldn't delete the review. Please try again." };
  }
}

export async function toggleTestimonialActiveAction(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission(MANAGE);
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed to edit reviews." };
  }

  try {
    const current = await getTestimonials(false);
    const target = current.find((t) => t.id === id);
    if (!target) return { success: false, error: "Review not found." };

    await persist(current.map((t) => (t.id === id ? { ...t, isActive } : t)));
    // Logged like the other two. Putting a review in front of customers, or
    // taking it away, is exactly the kind of change worth being able to trace.
    await logActivity({
      actor: ctx,
      action: "REVIEW_UPDATED",
      entityType: "REVIEW",
      entityId: id,
      description: `${isActive ? "Showed" : "Hid"} the review from ${target.name}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Toggle review error:", error);
    return { success: false, error: "Couldn't change the review. Please try again." };
  }
}

export async function reorderTestimonialsAction(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission(MANAGE);
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed to reorder reviews." };
  }

  try {
    const current = await getTestimonials(false);
    const idMap = new Map(current.map((t) => [t.id, t]));

    const reordered: Testimonial[] = [];
    for (const id of orderedIds) {
      const item = idMap.get(id);
      if (item) {
        reordered.push(item);
        idMap.delete(id);
      }
    }
    // Anything the caller did not mention keeps its place at the end, so a
    // stale list from another tab cannot drop reviews.
    for (const remaining of idMap.values()) reordered.push(remaining);

    await persist(reordered);
    await logActivity({
      actor: ctx,
      action: "REVIEW_UPDATED",
      entityType: "REVIEW",
      description: "Reordered the customer reviews carousel",
    });

    return { success: true };
  } catch (error) {
    console.error("Reorder reviews error:", error);
    return { success: false, error: "Couldn't reorder the reviews. Please try again." };
  }
}
