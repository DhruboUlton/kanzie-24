import { db } from "@/lib/db";

// The row of short looping clips on the homepage, each linking to a product.
// Stored in SiteSetting like the other homepage blocks, so no migration; the
// clips are one JSON list because the admin decides how many there are.
export const REELS_KEYS = {
  heading: "reels_heading",
  subheading: "reels_subheading",
  handle: "reels_handle",
  followUrl: "reels_follow_url",
  items: "reels_items",
} as const;

export const MAX_REELS = 12;

export type Reel = {
  video: string;
  // Where the hover "Shop now" button, and a tap on a phone, goes. Empty
  // means the clip is just a clip.
  href: string;
};

export type ReelsContent = {
  heading: string;
  subheading: string;
  // Shown beside a Follow button, which only appears with followUrl.
  handle: string;
  followUrl: string;
  // Empty hides the whole section.
  reels: Reel[];
};

export const DEFAULT_REELS: ReelsContent = {
  heading: "",
  subheading: "",
  handle: "",
  followUrl: "",
  reels: [],
};

/** Reads the stored list, dropping any entry without a video. */
export function parseReels(raw: unknown): Reel[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  const reels: Reel[] = [];
  for (const entry of parsed) {
    const { video, href } = (entry ?? {}) as { video?: unknown; href?: unknown };
    if (typeof video !== "string" || !video.trim()) continue;
    reels.push({ video: video.trim(), href: typeof href === "string" ? href.trim() : "" });
  }
  return reels.slice(0, MAX_REELS);
}

// Throws on an unreachable database, like getBodyBannerContent(): a swallowed
// error would prerender the section as absent until something revalidated.
export async function getReels(): Promise<ReelsContent> {
  const rows = await db.siteSetting.findMany({
    where: { key: { in: Object.values(REELS_KEYS) } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const k = REELS_KEYS;
  return {
    heading: map[k.heading] ?? DEFAULT_REELS.heading,
    subheading: map[k.subheading] ?? DEFAULT_REELS.subheading,
    handle: map[k.handle] ?? DEFAULT_REELS.handle,
    followUrl: map[k.followUrl] ?? DEFAULT_REELS.followUrl,
    reels: parseReels(map[k.items]),
  };
}
