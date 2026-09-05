import "server-only";
import { unlink } from "fs/promises";
import { db } from "@/lib/db";
import { resolveUploadPath } from "@/lib/uploads";

// Deleting a product should not leave its photos and clips sitting on disk
// forever. Only files this app wrote are ever removed: an upload is served
// from /api/uploads/<name>, so anything else — a seed path under
// /products-dev/, a YouTube or Drive link, an external URL — is somebody
// else's file and is left alone.
const UPLOAD_PREFIX = "/api/uploads/";

export type ProductMediaSource = {
  images: unknown;
  videoUrl?: string | null;
  popupVideoUrl?: string | null;
};

/** Every media reference a product row holds, as a flat list of strings. */
export function collectMediaUrls(product: ProductMediaSource): string[] {
  const images = Array.isArray(product.images)
    ? product.images
    : typeof product.images === "string"
      ? safeParseArray(product.images)
      : [];

  return [...images, product.videoUrl, product.popupVideoUrl].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

function safeParseArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** The upload filename an URL points at, or null if it isn't one of ours. */
function uploadFilename(url: string): string | null {
  if (!url.startsWith(UPLOAD_PREFIX)) return null;
  const name = url.slice(UPLOAD_PREFIX.length).split(/[?#]/)[0];
  return name.length > 0 ? name : null;
}

/**
 * Removes the uploaded files belonging to a deleted product.
 *
 * Call this only after the product row is gone, so the "is anyone else using
 * this file?" check below cannot see the product being deleted and skip its
 * own files. A URL can legitimately appear on two products — duplicating a
 * product copies the strings, not the bytes — and deleting the file would
 * blank the image on the survivor, so a still-referenced file is kept.
 *
 * Never throws: media is best-effort cleanup, and a file that cannot be
 * removed must not fail a deletion that already happened.
 */
export async function deleteProductMedia(urls: string[]): Promise<{
  deleted: number;
  kept: number;
}> {
  const candidates = [...new Set(urls)].filter((url) => uploadFilename(url));
  if (candidates.length === 0) return { deleted: 0, kept: 0 };

  let deleted = 0;
  let kept = 0;

  for (const url of candidates) {
    try {
      if (await isStillReferenced(url)) {
        kept++;
        continue;
      }

      const name = uploadFilename(url);
      const path = name && resolveUploadPath([name]);
      if (!path) {
        kept++;
        continue;
      }

      await unlink(path);
      deleted++;
    } catch (error) {
      // Already gone is a success for our purposes.
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") deleted++;
      else {
        kept++;
        console.error("Failed to remove product media", url, error);
      }
    }
  }

  return { deleted, kept };
}

async function isStillReferenced(url: string): Promise<boolean> {
  const [asVideo, asImage] = await Promise.all([
    db.product.count({
      where: { OR: [{ videoUrl: url }, { popupVideoUrl: url }] },
    }),
    // Raw SQL because images is a JSON array: Prisma's string_contains
    // filter matches JSON *string* values and finds nothing inside an
    // array, so it reports every shared file as unused — which deletes a
    // photo a surviving product is still showing.
    db.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) AS n FROM Product
      WHERE JSON_CONTAINS(images, JSON_QUOTE(${url}))
    `,
  ]);

  return asVideo > 0 || Number(asImage[0]?.n ?? 0) > 0;
}
