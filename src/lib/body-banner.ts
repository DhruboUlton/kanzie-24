import { db } from "@/lib/db";
import { normalizeHex } from "@/lib/hero";

// The wide promo strip below the product rows on the homepage. Stored in
// SiteSetting like the hero, so no migration.
export const BODY_BANNER_KEYS = {
  eyebrow: "body_banner_eyebrow",
  headingLead: "body_banner_heading_lead",
  headingAccent: "body_banner_heading_accent",
  subheading: "body_banner_subheading",
  headingColor: "body_banner_heading_color",
  headingAccentColor: "body_banner_heading_accent_color",
  backgroundType: "body_banner_background_type",
  backgroundColor: "body_banner_background_color",
  backgroundImage: "body_banner_background_image",
  image: "body_banner_image",
  ctaLabel: "body_banner_cta_label",
  ctaHref: "body_banner_cta_href",
  note: "body_banner_note",
} as const;

export type BodyBannerBackgroundType = "color" | "image";

export type BodyBannerContent = {
  eyebrow: string;
  headingLead: string;
  headingAccent: string;
  subheading: string;
  headingColor: string;
  headingAccentColor: string;
  backgroundType: BodyBannerBackgroundType;
  backgroundColor: string;
  // Full-bleed background photo. Only used when backgroundType is "image";
  // the colour stays as the fallback behind it while it loads.
  backgroundImage: string;
  // Optional cut-out product shot on the right. Empty means the copy gets
  // the full width instead.
  image: string;
  ctaLabel: string;
  ctaHref: string;
  note: string;
};

export const DEFAULT_BODY_BANNER: BodyBannerContent = {
  eyebrow: "Full Hydraulic Action",
  headingLead: "DIG. HAUL.",
  headingAccent: "BUILD.",
  subheading:
    "Real hydraulic articulation, metal attachments, and 2.4GHz multi-channel controls.",
  headingColor: "#ffffff",
  headingAccentColor: "#c0282b",
  backgroundType: "color",
  backgroundColor: "#282828",
  backgroundImage: "",
  image: "/hero/jcb-backhoe-loader-2.png",
  ctaLabel: "SHOP MACHINES",
  ctaHref: "/products",
  note: "1-Year Official Warranty",
};

export async function getBodyBannerContent(): Promise<BodyBannerContent> {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: Object.values(BODY_BANNER_KEYS) } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    const d = DEFAULT_BODY_BANNER;
    return {
      eyebrow: map[BODY_BANNER_KEYS.eyebrow] ?? d.eyebrow,
      headingLead: map[BODY_BANNER_KEYS.headingLead] ?? d.headingLead,
      headingAccent: map[BODY_BANNER_KEYS.headingAccent] ?? d.headingAccent,
      subheading: map[BODY_BANNER_KEYS.subheading] ?? d.subheading,
      headingColor: normalizeHex(map[BODY_BANNER_KEYS.headingColor], d.headingColor),
      headingAccentColor: normalizeHex(
        map[BODY_BANNER_KEYS.headingAccentColor],
        d.headingAccentColor,
      ),
      backgroundType:
        map[BODY_BANNER_KEYS.backgroundType] === "image" ? "image" : "color",
      backgroundColor: normalizeHex(
        map[BODY_BANNER_KEYS.backgroundColor],
        d.backgroundColor,
      ),
      backgroundImage: map[BODY_BANNER_KEYS.backgroundImage] ?? d.backgroundImage,
      image: map[BODY_BANNER_KEYS.image] ?? d.image,
      ctaLabel: map[BODY_BANNER_KEYS.ctaLabel] ?? d.ctaLabel,
      ctaHref: map[BODY_BANNER_KEYS.ctaHref] ?? d.ctaHref,
      note: map[BODY_BANNER_KEYS.note] ?? d.note,
    };
  } catch {
    return DEFAULT_BODY_BANNER;
  }
}
