import { db } from "@/lib/db";

// The looping video panel under "Shop by machine". Stored in SiteSetting
// like the hero and body banner, so no migration.
export const VIDEO_BANNER_KEYS = {
  video: "video_banner_video",
  poster: "video_banner_poster",
  heading: "video_banner_heading",
  subheading: "video_banner_subheading",
  ctaLabel: "video_banner_cta_label",
  ctaHref: "video_banner_cta_href",
  overlay: "video_banner_overlay",
} as const;

export type VideoBannerContent = {
  // An uploaded file (or direct .mp4/.webm URL). Empty hides the whole
  // section, so a shop that never sets one shows nothing, not a demo.
  video: string;
  // Still shown until the video starts, and for anyone who never gets it.
  poster: string;
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  // Black scrim over the video, 0–100%, so white copy stays readable.
  overlay: number;
};

export const DEFAULT_VIDEO_BANNER: VideoBannerContent = {
  video: "",
  poster: "",
  heading: "",
  subheading: "",
  ctaLabel: "",
  ctaHref: "/products",
  overlay: 30,
};

// Throws on an unreachable database, like getBodyBannerContent(): a swallowed
// error would prerender the section as absent until something revalidated.
export async function getVideoBanner(): Promise<VideoBannerContent> {
  const rows = await db.siteSetting.findMany({
    where: { key: { in: Object.values(VIDEO_BANNER_KEYS) } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const d = DEFAULT_VIDEO_BANNER;
  const k = VIDEO_BANNER_KEYS;
  const overlay = Number(map[k.overlay]);
  return {
    video: map[k.video] ?? d.video,
    poster: map[k.poster] ?? d.poster,
    heading: map[k.heading] ?? d.heading,
    subheading: map[k.subheading] ?? d.subheading,
    ctaLabel: map[k.ctaLabel] ?? d.ctaLabel,
    ctaHref: map[k.ctaHref] ?? d.ctaHref,
    // Number("") is 0, which is a real answer, so blank must be told apart.
    overlay: map[k.overlay]?.trim() && Number.isFinite(overlay) ? overlay : d.overlay,
  };
}
