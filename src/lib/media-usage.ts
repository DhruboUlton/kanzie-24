import "server-only";
import { db } from "@/lib/db";

/**
 * Where a media file is being used, across the whole store.
 *
 * Media lives in one table but is referenced from three different shapes:
 * a join table (product galleries), plain columns (category art, product
 * video), and URL strings buried inside SiteSetting JSON blobs (hero,
 * banners, pop-up, reviews, brand strip). Nothing tied those together, so
 * "delete permanently" only ever knew about product galleries — deleting a
 * file used by the hero left a broken image on the homepage with no warning.
 */

export type MediaUsage = {
  /** Which part of the store — "Product", "Hero slider", … */
  area: string;
  /** The specific thing using it, e.g. a product name. */
  label: string;
  /** Where an admin goes to change it. */
  href?: string;
};

// SiteSetting rows are scanned by value rather than by a hardcoded list of
// keys, so a feature added later that stores a URL is covered the day it
// ships. This map only supplies nicer names for the keys we know about;
// anything unknown still reports, using a humanised version of its key.
const SETTING_LABELS: Record<string, { area: string; href: string }> = {
  hero_slides: { area: "Hero slider", href: "/adpnl/banner" },
  hero_banner_slides: { area: "Hero banner", href: "/adpnl/banner" },
  body_banner_image: { area: "Body banner", href: "/adpnl/banner" },
  body_banner_background_image: { area: "Body banner background", href: "/adpnl/banner" },
  brand_strip_marks: { area: "Brand strip", href: "/adpnl/banner" },
  reels_items: { area: "Reels", href: "/adpnl/banner" },
  video_banner_video: { area: "Video banner", href: "/adpnl/banner" },
  video_banner_poster: { area: "Video banner cover", href: "/adpnl/banner" },
  storefront_popup: { area: "Pop-up", href: "/adpnl/popup" },
  storefront_testimonials: { area: "Customer reviews", href: "/adpnl/reviews" },
  site_favicon: { area: "Site icon", href: "/adpnl/settings" },
};

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * True when `haystack` references `url` as a whole value.
 *
 * A bare substring test would let "/uploads/a.jpg" match
 * "/uploads/a.jpg.bak" or "/uploads/a.jpg2". Requiring the next character
 * to be a non-URL one (a quote, a comma, or the end of the string) keeps
 * the check honest without needing to parse each blob's shape.
 */
function referencesUrl(haystack: string, url: string): boolean {
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(url, from);
    if (at === -1) return false;
    const next = haystack[at + url.length];
    if (next === undefined || !/[A-Za-z0-9._~%-]/.test(next)) return true;
    from = at + 1;
  }
}

/**
 * Every place this URL is currently referenced. Empty means safe to delete.
 *
 * Read-only; callers do their own permission checks.
 */
export async function findMediaUsage(url: string): Promise<MediaUsage[]> {
  const trimmed = url.trim();
  if (!trimmed) return [];

  const usage: MediaUsage[] = [];

  // 1. Product galleries (the one relationship the old check knew about).
  const galleries = await db.productMedia.findMany({
    where: { media: { url: trimmed } },
    select: { product: { select: { id: true, name: true, sku: true } } },
  });
  for (const g of galleries) {
    if (!g.product) continue;
    usage.push({
      area: "Product gallery",
      label: g.product.sku ? `${g.product.name} (${g.product.sku})` : g.product.name,
      href: `/adpnl/products/${g.product.id}/edit`,
    });
  }

  // 2. Product video slots and any image embedded in the description HTML.
  const products = await db.product.findMany({
    where: {
      OR: [
        { videoUrl: trimmed },
        { popupVideoUrl: trimmed },
        { description: { contains: trimmed } },
      ],
    },
    select: { id: true, name: true, videoUrl: true, popupVideoUrl: true, description: true },
  });
  for (const p of products) {
    const where: string[] = [];
    if (p.videoUrl === trimmed) where.push("gallery video");
    if (p.popupVideoUrl === trimmed) where.push("pop-up video");
    if (p.description && referencesUrl(p.description, trimmed)) where.push("description");
    if (where.length === 0) continue;
    usage.push({
      area: "Product",
      label: `${p.name} — ${where.join(", ")}`,
      href: `/adpnl/products/${p.id}/edit`,
    });
  }

  // 3. Category tile art.
  const categories = await db.category.findMany({
    where: { imageUrl: trimmed },
    select: { name: true },
  });
  for (const c of categories) {
    usage.push({ area: "Category tile", label: c.name, href: "/adpnl/categories" });
  }

  // 4. Everything stored as settings — hero, banners, pop-up, reviews,
  //    brand strip, site icon. Scanned rather than enumerated; the table is
  //    small enough that reading it whole costs nothing.
  const settings = await db.siteSetting.findMany({ select: { key: true, value: true } });
  for (const s of settings) {
    if (!s.value || !referencesUrl(s.value, trimmed)) continue;
    const known = SETTING_LABELS[s.key];
    usage.push({
      area: known?.area ?? humanizeKey(s.key),
      label: known ? "in use" : `setting "${s.key}"`,
      href: known?.href ?? "/adpnl/settings",
    });
  }

  return usage;
}
