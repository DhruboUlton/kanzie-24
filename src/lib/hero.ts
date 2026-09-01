import { db } from "@/lib/db";

// Hero banner content lives in SiteSetting rather than its own table —
// it's a single record's worth of copy plus a small ordered list, so a
// JSON blob keeps it migration-free alongside the other store settings.
export const HERO_KEYS = {
  headingLead: "hero_heading_lead",
  headingAccent: "hero_heading_accent",
  headingTail: "hero_heading_tail",
  subheading: "hero_subheading",
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
};

export type HeroContent = {
  headingLead: string;
  headingAccent: string;
  headingTail: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  slides: HeroSlide[];
};

export const DEFAULT_HERO: HeroContent = {
  headingLead: "REALISTIC",
  headingAccent: "REMOTE CONTROL",
  headingTail: "CONSTRUCTION TOYS",
  subheading: "Big machines. Big fun. Built for little builders.",
  ctaLabel: "SHOP RC TOYS →",
  ctaHref: "/products",
  slides: [
    { src: "/hero/top-power-excavator.png", alt: "Top Power RC excavator", groundOffset: 2, leftGap: 5, rightGap: 4 },
    { src: "/hero/jcb-backhoe-loader-1.png", alt: "JCB RC backhoe loader", groundOffset: 7, leftGap: 3, rightGap: 3 },
    { src: "/hero/jcb-backhoe-loader-2.png", alt: "JCB RC backhoe loader, arm raised", groundOffset: 0, leftGap: 2, rightGap: 0 },
    { src: "/hero/jcb-220x-excavator.png", alt: "JCB 220X LC RC excavator", groundOffset: 12, leftGap: 6, rightGap: 6 },
  ],
};

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
      ctaLabel: map[HERO_KEYS.ctaLabel] ?? DEFAULT_HERO.ctaLabel,
      ctaHref: map[HERO_KEYS.ctaHref] ?? DEFAULT_HERO.ctaHref,
      slides: parseSlides(map[HERO_KEYS.slides]) ?? DEFAULT_HERO.slides,
    };
  } catch {
    // DB unreachable — the storefront still renders the shipped banner.
    return DEFAULT_HERO;
  }
}
