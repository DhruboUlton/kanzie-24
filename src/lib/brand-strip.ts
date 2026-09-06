import { db } from "@/lib/db";

// The row of wordmarks under New Arrivals. Stored as one JSON blob in
// SiteSetting, like the hero and body banner, so it needs no migration —
// and unlike those it is a list, whose length the admin decides.
export const BRAND_STRIP_KEY = "brand_strip_marks";

// Each mark picks a typeface so the row reads as several different brands
// rather than one word repeated in one font. The admin picks from these
// rather than typing a class, because arbitrary class names from a form
// would be a styling free-for-all that Tailwind has not compiled anyway.
export const BRAND_MARK_STYLES = {
  display: { label: "Display", className: "font-display tracking-wide" },
  serifItalic: { label: "Serif italic", className: "font-serif italic" },
  sansBlack: { label: "Sans bold", className: "font-sans font-black" },
  serif: { label: "Serif", className: "font-serif" },
  displayWide: { label: "Display wide", className: "font-display tracking-widest" },
} as const;

export type BrandMarkStyle = keyof typeof BRAND_MARK_STYLES;

export type BrandMark = {
  name: string;
  style: BrandMarkStyle;
};

export const DEFAULT_BRAND_STRIP_ENABLED = true;
export const BRAND_STRIP_ENABLED_KEY = "brand_strip_enabled";

/** Placeholder names, not real companies. Replace them in /adpnl/banner. */
export const DEFAULT_BRAND_MARKS: BrandMark[] = [
  { name: "Backyard Builder", style: "display" },
  { name: "Kidville Times", style: "serifItalic" },
  { name: "PlayScout", style: "sansBlack" },
  { name: "The Toy Weekly", style: "serif" },
  { name: "Rugged & Little", style: "displayWide" },
];

export const MAX_BRAND_MARKS = 12;
export const MAX_BRAND_NAME_LENGTH = 40;

export function isBrandMarkStyle(value: unknown): value is BrandMarkStyle {
  return typeof value === "string" && value in BRAND_MARK_STYLES;
}

export function classNameFor(style: BrandMarkStyle): string {
  return BRAND_MARK_STYLES[style].className;
}

/**
 * Reads the stored list, discarding anything malformed.
 *
 * The column holds free-form JSON written by a form, so every entry is
 * checked rather than trusted: a bad row costs its own mark, not the strip.
 * An empty stored list is a real answer — it means the admin removed every
 * mark — so it is returned as-is rather than falling back to the defaults.
 */
export function parseBrandMarks(raw: unknown): BrandMark[] | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;

  const marks: BrandMark[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const { name, style } = entry as { name?: unknown; style?: unknown };
    if (typeof name !== "string") continue;
    const trimmed = name.trim().slice(0, MAX_BRAND_NAME_LENGTH);
    if (!trimmed) continue;
    marks.push({
      name: trimmed,
      style: isBrandMarkStyle(style) ? style : "display",
    });
  }
  return marks.slice(0, MAX_BRAND_MARKS);
}

export type BrandStripContent = {
  enabled: boolean;
  marks: BrandMark[];
};

export async function getBrandStrip(): Promise<BrandStripContent> {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: [BRAND_STRIP_KEY, BRAND_STRIP_ENABLED_KEY] } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    const stored = map[BRAND_STRIP_KEY];
    const marks = stored === undefined ? null : parseBrandMarks(stored);

    return {
      enabled: map[BRAND_STRIP_ENABLED_KEY]
        ? map[BRAND_STRIP_ENABLED_KEY] === "true"
        : DEFAULT_BRAND_STRIP_ENABLED,
      marks: marks ?? DEFAULT_BRAND_MARKS,
    };
  } catch {
    return { enabled: DEFAULT_BRAND_STRIP_ENABLED, marks: DEFAULT_BRAND_MARKS };
  }
}
