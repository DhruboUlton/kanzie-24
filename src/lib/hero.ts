import { db } from "@/lib/db";

// Hero banner content lives in SiteSetting rather than its own table —
// it's a single record's worth of copy plus a small ordered list, so a
// JSON blob keeps it migration-free alongside the other store settings.
export const HERO_KEYS = {
  mode: "hero_mode",
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
  bannerSlides: "hero_banner_slides",
} as const;

// Two mutually exclusive hero styles. Stored as one value rather than a
// pair of on/off flags so "both at once" is unrepresentable.
//   coverflow — cut-out PNGs rotating over a solid colour (the original)
//   banner    — full-bleed banner artwork, one image per slide
export type HeroMode = "coverflow" | "banner";

export const HERO_MODES: HeroMode[] = ["coverflow", "banner"];

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

// A full-bleed banner image. Every text field is optional — leave them all
// empty and the slide is nothing but the artwork, which is the point of
// this mode: most shops bake the copy into the image itself.
export type BannerSlide = {
  src: string;
  alt: string;
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  // Where the copy sits over the image. Ignored when no text is set.
  align: BannerAlign;
  // Vertical placement of the same copy. A separate axis from `align` so
  // choosing one never disturbs the other.
  vAlign: BannerVAlign;
  textColor: string;
  // Black scrim between image and text, 0–100%. 0 = none. Needed because
  // a photo's brightness varies across the frame and plain white text on a
  // pale sky is unreadable.
  overlay: number;
  // Shape of that scrim. "solid" is a flat wash (the only option before
  // this field existed); the others fade from one edge so the rest of the
  // artwork stays clean.
  scrim: BannerScrim;
};

export type BannerAlign = "left" | "center" | "right";

export const BANNER_ALIGNMENTS: BannerAlign[] = ["left", "center", "right"];

export type BannerVAlign = "top" | "middle" | "bottom";

export const BANNER_VALIGNMENTS: BannerVAlign[] = ["top", "middle", "bottom"];

export type BannerScrim = "bottom" | "left" | "right" | "solid";

export const BANNER_SCRIMS: BannerScrim[] = ["bottom", "left", "right", "solid"];

export type HeroContent = {
  mode: HeroMode;
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
  // Only rendered in "banner" mode; kept alongside the coverflow slides so
  // switching modes never destroys the other mode's setup.
  bannerSlides: BannerSlide[];
};

export const DEFAULT_BANNER_SLIDE: Omit<BannerSlide, "src"> = {
  alt: "",
  heading: "",
  subheading: "",
  ctaLabel: "",
  ctaHref: "",
  align: "left",
  vAlign: "bottom",
  textColor: "#ffffff",
  overlay: 35,
  scrim: "bottom",
};

export const DEFAULT_HERO: HeroContent = {
  mode: "coverflow",
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
  bannerSlides: [],
};

// Slides saved before zoom existed have no value; treat those as 100 and
// keep the rest inside a range that can't collapse or explode the slider.
export function clampZoom(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(300, Math.max(10, n));
}

// Scrim strength, as a whole percentage that can't leave 0–100.
export function clampOverlay(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_BANNER_SLIDE.overlay;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function normalizeMode(value: string | undefined): HeroMode {
  return value === "banner" ? "banner" : "coverflow";
}

// Banner mode only actually renders when there's something to show — a
// half-filled row (added, no URL pasted yet) doesn't count.
export function hasRenderableBanner(content: HeroContent): boolean {
  return (
    content.mode === "banner" &&
    content.bannerSlides.some((s) => s.src.trim().length > 0)
  );
}

export function normalizeAlign(value: unknown): BannerAlign {
  return value === "center" || value === "right" ? value : "left";
}

export function normalizeVAlign(value: unknown): BannerVAlign {
  return value === "top" || value === "middle" ? value : "bottom";
}

export function normalizeScrim(value: unknown): BannerScrim {
  return value === "solid" || value === "left" || value === "right"
    ? value
    : "bottom";
}

// Heading and subheading carry the line breaks typed with Enter in the
// admin textarea. Normalised so what renders matches what the textarea
// showed: CRLF from a paste is flattened, a trailing space before a break
// is dropped (under `whitespace-pre-line` it would render as a ragged
// indent), and a run of blank lines can't be used to shove the copy off
// the image.
export function normalizeMultiline(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Only ever let a real hex colour reach an inline style attribute.
export function normalizeHex(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}

// A CTA link ends up as an <a href> on the storefront. Only two shapes are
// allowed through: a same-origin path (one leading slash, so not "//host"
// or "/\host" which browsers read as protocol-relative), or an explicit
// http(s):// URL. Everything else — javascript:, data:, mailto:, bare
// "host.com" — falls back, which kills both the javascript: click vector
// and the protocol-relative off-site redirect. `fallback` is "/products"
// for the main CTA and "" for a banner slide with no button.
export function normalizeCtaHref(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v) return fallback;

  if (v.startsWith("/")) {
    return v.startsWith("//") || v.startsWith("/\\") ? fallback : v;
  }

  try {
    const url = new URL(v);
    return url.protocol === "http:" || url.protocol === "https:" ? v : fallback;
  } catch {
    return fallback;
  }
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

// Unlike the coverflow slides there's no shipped default to fall back on,
// so an empty list is a legitimate answer — the storefront falls back to
// coverflow rather than rendering an empty banner (see Hero.tsx).
function parseBannerSlides(raw: string | undefined): BannerSlide[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s.src === "string" && s.src.trim())
      .map((s) => ({
        src: String(s.src),
        alt: typeof s.alt === "string" ? s.alt : "",
        heading: normalizeMultiline(s.heading),
        subheading: normalizeMultiline(s.subheading),
        ctaLabel: typeof s.ctaLabel === "string" ? s.ctaLabel : "",
        ctaHref: typeof s.ctaHref === "string" ? s.ctaHref : "",
        align: normalizeAlign(s.align),
        vAlign: normalizeVAlign(s.vAlign),
        textColor: normalizeHex(s.textColor, DEFAULT_BANNER_SLIDE.textColor),
        overlay: clampOverlay(s.overlay),
        scrim: normalizeScrim(s.scrim),
      }));
  } catch {
    return [];
  }
}

// See the note on getBodyBannerContent(): this throws on an unreachable
// database rather than serving DEFAULT_HERO, which the admin form would
// then happily save back over the real slides.
export async function getHeroContent(): Promise<HeroContent> {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: Object.values(HERO_KEYS) } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    return {
      mode: normalizeMode(map[HERO_KEYS.mode]),
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
      bannerSlides: parseBannerSlides(map[HERO_KEYS.bannerSlides]),
    };
}
