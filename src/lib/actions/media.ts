"use server";

import { unlink } from "fs/promises";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAdminContext, requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { resolveUploadPath } from "@/lib/uploads";
import { findMediaUsage } from "@/lib/media-usage";

export type MediaSort = "newest" | "oldest" | "name_asc" | "size_desc";

export type GetMediaParams = {
  search?: string;
  type?: "IMAGE" | "VIDEO" | "ALL";
  sort?: MediaSort;
  page?: number;
  limit?: number;
};

export async function getMediaListAction(params: GetMediaParams = {}) {
  try {
    await requirePermission("MEDIA_VIEW");
  } catch (error) {
    return {
      ...(authErrorResult(error) ?? { success: false, error: "Not allowed." }),
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
    };
  }

  const {
    search = "",
    type = "ALL",
    sort = "newest",
    page = 1,
    limit = 40,
  } = params;

  const where: any = {};

  if (type === "IMAGE" || type === "VIDEO") {
    where.type = type;
  }

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { filename: { contains: term } },
      { title: { contains: term } },
      { altText: { contains: term } },
    ];
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "oldest") orderBy = { createdAt: "asc" };
  else if (sort === "name_asc") orderBy = { filename: "asc" };
  else if (sort === "size_desc") orderBy = { size: "desc" };

  try {
    const total = await db.media.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const skip = (currentPage - 1) * limit;

    const items = await db.media.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        _count: {
          select: { productMedia: true },
        },
      },
    });

    return {
      success: true,
      items: items.map((item) => ({
        ...item,
        usageCount: item._count.productMedia,
      })),
      total,
      page: currentPage,
      totalPages,
    };
  } catch (error: any) {
    console.error("getMediaListAction error:", error);
    return {
      success: false,
      error: error.message || "Failed to load media items",
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
    };
  }
}

export async function getMediaUsageAction(id: string) {
  try {
    await requirePermission("MEDIA_VIEW");
  } catch (error) {
    return { ...(authErrorResult(error) ?? { success: false, error: "Not allowed." }), usage: [] };
  }

  try {
    const media = await db.media.findUnique({
      where: { id },
      select: { url: true },
    });

    if (!media) {
      return { success: false, error: "Media not found", usage: [] };
    }

    return { success: true, usage: await findMediaUsage(media.url) };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to query usage",
      usage: [],
    };
  }
}

export async function updateMediaMetadataAction(
  id: string,
  data: { title?: string | null; altText?: string | null }
) {
  let ctx;
  try {
    ctx = await requirePermission("MEDIA_UPLOAD");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  try {
    const updated = await db.media.update({
      where: { id },
      data: {
        title: data.title?.trim() || null,
        altText: data.altText?.trim() || null,
      },
    });

    await logActivity({
      actor: ctx,
      action: "MEDIA_UPDATED",
      entityType: "MEDIA",
      entityId: id,
      description: `Updated metadata for media: ${updated.filename}`,
      metadata: { title: updated.title, altText: updated.altText },
    });

    revalidatePath("/adpnl/media");
    return { success: true, media: updated };
  } catch (error: any) {
    console.error("updateMediaMetadataAction error:", error);
    return { success: false, error: error.message || "Failed to update media" };
  }
}

/**
 * Delete a media file for good.
 *
 * Refuses while anything on the storefront still points at it. There is no
 * override parameter any more: the old `force` flag existed to push past
 * the product-gallery warning, and every use of it produced a broken image
 * somewhere.
 */
export async function deleteMediaPermanentlyAction(id: string) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { success: false, error: "Unauthorized" };
  }

  const canDelete =
    ctx.roleKey === "OWNER" ||
    ctx.permissions.includes("MEDIA_DELETE") ||
    ctx.permissions.includes("PRODUCTS_DELETE");

  if (!canDelete) {
    return {
      success: false,
      error: "Permission denied. Only Owner or staff with delete permissions can permanently delete media.",
    };
  }

  try {
    const media = await db.media.findUnique({
      where: { id },
      select: { url: true, filename: true, type: true, size: true },
    });

    if (!media) {
      return { success: false, error: "Media item not found" };
    }

    // Deleting a file that is on the storefront does not remove it from the
    // hero or the product showing it — it just turns that into a broken
    // image nobody notices until a customer does. Detach it there first.
    const usage = await findMediaUsage(media.url);
    if (usage.length > 0) {
      const areas = Array.from(new Set(usage.map((u) => u.area)));
      return {
        success: false,
        error: `In use in ${usage.length} place${usage.length === 1 ? "" : "s"} (${areas.join(", ")}). Remove it there first, then delete it here.`,
        inUse: true,
        usage,
      };
    }

    const uploadPrefix = "/api/uploads/";
    if (media.url.startsWith(uploadPrefix)) {
      const filename = media.url.slice(uploadPrefix.length).split(/[?#]/)[0];
      if (filename) {
        const filePath = resolveUploadPath([filename]);
        if (filePath) {
          try {
            await unlink(filePath);
          } catch (err: any) {
            if (err?.code !== "ENOENT") {
              console.warn("Could not delete physical media file:", filePath, err);
            }
          }
        }
      }
    }

    await db.media.delete({
      where: { id },
    });

    await logActivity({
      actor: ctx,
      action: "MEDIA_DELETED",
      entityType: "MEDIA",
      entityId: id,
      description: `Permanently deleted media: ${media.filename}`,
      // No unlinkedProductsCount: deletion is refused while anything still
      // references the file, so it could only ever log 0.
      metadata: { url: media.url, type: media.type, size: media.size },
    });

    revalidatePath("/adpnl/media");
    revalidatePath("/adpnl/products");
    return { success: true };
  } catch (error: any) {
    console.error("deleteMediaPermanentlyAction error:", error);
    return { success: false, error: error.message || "Failed to delete media item" };
  }
}
