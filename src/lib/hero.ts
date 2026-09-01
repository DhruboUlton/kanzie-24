import { db } from "@/lib/db";

// Hero banner content lives in SiteSetting rather than its own table —
// it's a single record's worth of copy plus a small ordered list, so a
// JSON blob keeps it migration-free alongside the other store settings.
export const HERO_KEYS = {
  headingLead: "hero_heading_lead",
  headingAccent: "hero_heading_accent",
  headingTail: "hero_heading_tail",
  subheading: "hero_subheading",
  headingColor: "hero_heading_color",
  headingAccentColor: "hero_heading_accent_color",
  backgroundColor: "hero_background_color",
  watermarkColor: "hero_watermark_color",
  ctaLabel: "hero_cta_label",
  ctaHref: "hero_cta_href",
  slides: "hero_slides",
} as const;

export type HeroSlide = {
  src: string;
  alt: string;
  // Each transparent PNG carries a different amount of empty space around
  // the vehicle, so these nudge the artwork (as a % of the frame) to line
  // the machines up with each other rather than with their canvas edges.
  groundOffset: number;
  leftGap: number;
  rightGap: number;
  // Per-slide size as a percentage of the slider's own scaling, so one
  // oversized or undersized PNG can be matched to the rest. 100 = as-is.
  zoom: number;
  // The oversized word shown behind this slide while it's centred. Empty
  // means no word for this one.
  word: string;
};

export type HeroContent = {
  headingLead: string;
  headingAccent: string;
  headingTail: string;
  subheading: string;
  // Hex colours for the heading text and its highlighted span. Kept as
  // values rather than classes so the picker can offer anything, not just
  // the brand palette.
  headingColor: string;
  headingAccentColor: string;
  // Section background. The word behind the slider belongs to whichever
  // slide is centred (see HeroSlide.word); this is just its colour.
  backgroundColor: string;
  watermarkColor: string;
  ctaLabel: string;
  ctaHref: string;
  slides: HeroSlide[];
};

export const DEFAULT_HERO: HeroContent = {
  headingLead: "REALISTIC",
  headingAccent: "REMOTE CONTROL",
  headingTail: "CONSTRUCTION TOYS",
  subheading: "Big machines. Big fun. Built for little builders.",
  headingColor: "#282828",
  headingAccentColor: "#c0282b",
  backgroundColor: "#d5d2c7",
  watermarkColor: "#000000",
  ctaLabel: "SHOP RC TOYS →",
  ctaHref: "/products",
  slides: [
    { src: "/hero/top-power-excavator.png", alt: "Top Power RC excavator", groundOffset: 2, leftGap: 5, rightGap: 4, zoom: 100, word: "DIG" },
    { src: "/hero/jcb-backhoe-loader-1.png", alt: "JCB RC backhoe loader", groundOffset: 7, leftGap: 3, rightGap: 3, zoom: 100, word: "HAUL" },
    { src: "/hero/jcb-backhoe-loader-2.png", alt: "JCB RC backhoe loader, arm raised", groundOffset: 0, leftGap: 2, rightGap: 0, zoom: 100, word: "PUSH" },
    { src: "/hero/jcb-220x-excavator.png", alt: "JCB 220X LC RC excavator", groundOffset: 12, leftGap: 6, rightGap: 6, zoom: 100, word: "BUILD" },
  ],
};

// Slides saved before zoom existed have no value; treat those as 100 and
// keep the rest inside a range that can't collapse or explode the slider.
export function clampZoom(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(300, Math.max(10, n));
}

// Only ever let a real hex colour reach an inline style attribute.
export function normalizeHex(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}

function parseSlides(raw: string | undefined): HeroSlide[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const slides = parsed
      .filter((s) => s && typeof s.src === "string" && s.src.trim())
      .map((s) => ({
        src: String(s.src),
        alt: typeof s.alt === "string" ? s.alt : "",
        groundOffset: Number(s.groundOffset) || 0,
        leftGap: Number(s.leftGap) || 0,
        rightGap: Number(s.rightGap) || 0,
        zoom: clampZoom(s.zoom),
        word: typeof s.word === "string" ? s.word : "",
      }));
    return slides.length > 0 ? slides : null;
  } catch {
    return null;
  }
}

export async function getHeroContent(): Promise<HeroContent> {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: Object.values(HERO_KEYS) } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    return {
      headingLead: map[HERO_KEYS.headingLead] ?? DEFAULT_HERO.headingLead,
      headingAccent: map[HERO_KEYS.headingAccent] ?? DEFAULT_HERO.headingAccent,
      headingTail: map[HERO_KEYS.headingTail] ?? DEFAULT_HERO.headingTail,
      subheading: map[HERO_KEYS.subheading] ?? DEFAULT_HERO.subheading,
      headingColor: normalizeHex(map[HERO_KEYS.headingColor], DEFAULT_HERO.headingColor),
      headingAccentColor: normalizeHex(
        map[HERO_KEYS.headingAccentColor],
        DEFAULT_HERO.headingAccentColor,
      ),
      backgroundColor: normalizeHex(
        map[HERO_KEYS.backgroundColor],
        DEFAULT_HERO.backgroundColor,
      ),
      watermarkColor: normalizeHex(
        map[HERO_KEYS.watermarkColor],
        DEFAULT_HERO.watermarkColor,
      ),
      ctaLabel: map[HERO_KEYS.ctaLabel] ?? DEFAULT_HERO.ctaLabel,
      ctaHref: map[HERO_KEYS.ctaHref] ?? DEFAULT_HERO.ctaHref,
      slides: parseSlides(map[HERO_KEYS.slides]) ?? DEFAULT_HERO.slides,
    };
  } catch {
    // DB unreachable — the storefront still renders the shipped banner.
    return DEFAULT_HERO;
  }
}
