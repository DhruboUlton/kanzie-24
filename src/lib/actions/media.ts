"use server";

import { unlink } from "fs/promises";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAdminContext, requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { resolveUploadPath } from "@/lib/uploads";

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
    return { ...(authErrorResult(error) ?? { success: false, error: "Not allowed." }), products: [] };
  }

  try {
    const media = await db.media.findUnique({
      where: { id },
      include: {
        productMedia: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, sku: true },
            },
          },
        },
      },
    });

    if (!media) {
      return { success: false, error: "Media not found", products: [] };
    }

    const products = media.productMedia.map((pm) => pm.product);
    return { success: true, products };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to query usage", products: [] };
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
 * Permanently deletes a media asset.
 *
 * Refuses when the asset is still attached to any product unless `force` is
 * set — the picker's usage warning used to be purely informational, so
 * confirming past it deleted the file out from under live products anyway.
 * Now the caller has to pass `force: true` (after the admin explicitly
 * acknowledges the warning) to go through with it while still in use.
 */
export async function deleteMediaPermanentlyAction(id: string, force = false) {
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
      include: {
        productMedia: {
          select: {
            productId: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    if (!media) {
      return { success: false, error: "Media item not found" };
    }

    if (media.productMedia.length > 0 && !force) {
      return {
        success: false,
        error: `Still attached to ${media.productMedia.length} product(s). Confirm again to delete it anyway.`,
        inUse: true,
        products: media.productMedia.map((pm) => pm.product),
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
      metadata: {
        url: media.url,
        type: media.type,
        size: media.size,
        unlinkedProductsCount: media.productMedia.length,
      },
    });

    revalidatePath("/adpnl/media");
    revalidatePath("/adpnl/products");
    return { success: true };
  } catch (error: any) {
    console.error("deleteMediaPermanentlyAction error:", error);
    return { success: false, error: error.message || "Failed to delete media item" };
  }
}
