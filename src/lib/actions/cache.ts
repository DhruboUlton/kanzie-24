"use server";

import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { getProducts } from "@/lib/products";
import { CATALOG_TAG, SITE_CHROME_TAG } from "@/lib/cache-tags";
import { SITE_URL } from "@/lib/site-config";

export type CacheState = "HIT" | "MISS" | "STALE" | "LIVE" | "ERROR";
export type CacheRow = { path: string; state: CacheState };

const STATIC_PAGES = [
  "/",
  "/products",
  "/about",
  "/contact",
  "/terms",
  "/careers",
  "/track",
  "/cart",
  "/checkout",
];

async function shopPaths(): Promise<string[]> {
  const products = await getProducts();
  return [...STATIC_PAGES, ...products.map((p) => `/products/${p.slug}`)];
}

/**
 * Visits shop pages and reports what Next said about each one's cache.
 * All of them, or only `only` when given (used straight after a rebuild).
 *
 * Next exposes no way to look into the cache without a request, so this is
 * a real visit: a page that had no saved copy is built and saved by it, and
 * reads MISS.
 *
 * One page at a time, so a full check never holds more than a few database
 * connections open at once.
 */
export async function checkCacheAction(only?: string[]): Promise<
  { success: true; rows: CacheRow[] } | { success: false; error: string }
> {
  try {
    await requirePermission("SETTINGS_VIEW");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  // The shop's own fixed address in production. Never the request's Host
  // header there: that is client-supplied, and would let a request point
  // this server's fetches anywhere. The dev server checks itself instead.
  const origin =
    process.env.NODE_ENV === "production"
      ? SITE_URL
      : `http://${(await headers()).get("host")}`;

  // Only ever known shop pages, whatever the browser sent.
  const all = await shopPaths();
  const paths = only ? all.filter((p) => only.includes(p)) : all;

  const rows: CacheRow[] = [];
  for (const path of paths) {
    try {
      const res = await fetch(origin + path, {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      await res.arrayBuffer();
      const header = res.headers.get("x-nextjs-cache")?.toUpperCase();
      const state: CacheState = !res.ok
        ? "ERROR"
        : header === "HIT" || header === "MISS" || header === "STALE"
          ? header
          : "LIVE";
      rows.push({ path, state });
    } catch {
      rows.push({ path, state: "ERROR" });
    }
  }
  return { success: true, rows };
}

/**
 * Throws away the saved copy of the chosen pages. The caller then visits
 * them with checkCacheAction, which builds them again — a separate request,
 * because a purge made inside a server action only lands once it returns.
 *
 * Choosing every page also clears the shared header, menu and catalogue
 * data, which no single page can do on its own: those are shared by all.
 */
export async function rebuildPagesAction(
  paths: string[],
): Promise<{ success: true; paths: string[] } | { success: false; error: string }> {
  let ctx;
  try {
    ctx = await requirePermission("SETTINGS_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const all = await shopPaths();
  const chosen = all.filter((p) => paths.includes(p));
  if (chosen.length === 0) return { success: false, error: "Select at least one page." };

  if (chosen.length === all.length) {
    revalidatePath("/", "layout");
    updateTag(CATALOG_TAG);
    updateTag(SITE_CHROME_TAG);
  } else {
    for (const path of chosen) revalidatePath(path);
  }

  await logActivity({
    actor: ctx,
    action: "CACHE_REFRESHED",
    description:
      chosen.length === all.length
        ? "Rebuilt every saved shop page"
        : `Rebuilt ${chosen.length} saved shop page${chosen.length === 1 ? "" : "s"}`,
    metadata: { paths: chosen },
  });
  return { success: true, paths: chosen };
}
