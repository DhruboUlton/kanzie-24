import { unstable_cache } from "next/cache";
import { SITE_CHROME_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";

export const POPUP_KEY = "storefront_popup";

export type PopupFrequency = "once_per_session" | "once_per_day" | "every_load";
export type PopupTargetPages = "all" | "home_only" | "products_only";

// The config lives in one SiteSetting TEXT column, and every field here is
// rendered verbatim on the storefront. Caps keep both honest.
export const MAX_BADGE = 40;
export const MAX_TITLE = 90;
export const MAX_DESCRIPTION = 300;
export const MAX_COUPON = 40;
export const MAX_BUTTON_TEXT = 40;
export const MAX_FOOTER = 200;
export const MAX_URL = 300;

/**
 * Same-site paths only, for the button target and the image.
 *
 * The button becomes a <Link href>, so an off-site value would quietly walk
 * customers out of the shop from a modal that looks like the shop's own.
 * "//host" is protocol-relative and leaves too, so it is excluded.
 */
export function normalizeSitePath(raw: unknown): string | null {
  const value = typeof raw === "string" ? raw.trim().slice(0, MAX_URL) : "";
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export interface PopupConfig {
  enabled: boolean;
  imageUrl: string;
  imageAlt: string;
  badgeText: string;
  title: string;
  description: string;
  couponCode: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText: string;
  footerText: string;
  delaySeconds: number;
  showFrequency: PopupFrequency;
  targetPages: PopupTargetPages;
}

export const DEFAULT_POPUP: PopupConfig = {
  // Off until someone writes the offer and turns it on. Shipping this
  // enabled would put a discount in front of every visitor the moment the
  // feature deployed, advertising a code nobody had created yet.
  enabled: false,
  imageUrl: "",
  imageAlt: "Special Offer",
  badgeText: "EXCLUSIVE OFFER",
  title: "FUEL YOUR RC OBSESSION",
  description: "Save 10% on your order today! Use our special discount code at checkout.",
  couponCode: "BRRRRT10",
  primaryButtonText: "SHOP NOW",
  primaryButtonUrl: "/products",
  secondaryButtonText: "No, thanks",
  footerText: "Limited time offer on select remote control machines.",
  // Past the window Lighthouse films for Speed Index. A modal covering the
  // viewport at 2s measured ~3.3s against ~1.3s without it — the same effect
  // the hero autoplay had. Lower it deliberately if the trade is worth it.
  delaySeconds: 8,
  showFrequency: "once_per_session",
  targetPages: "all",
};

export function sanitizePopupConfig(raw: unknown): PopupConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_POPUP };
  }

  const obj = raw as Record<string, unknown>;

  const clip = (v: unknown, max: number, fallback: string) =>
    typeof v === "string" ? v.trim().slice(0, max) : fallback;

  const sanitizeFrequency = (f: unknown): PopupFrequency => {
    if (f === "once_per_day" || f === "every_load" || f === "once_per_session") {
      return f;
    }
    return DEFAULT_POPUP.showFrequency;
  };

  const sanitizeTargetPages = (t: unknown): PopupTargetPages => {
    if (t === "home_only" || t === "products_only" || t === "all") {
      return t;
    }
    return DEFAULT_POPUP.targetPages;
  };

  const delaySeconds =
    typeof obj.delaySeconds === "number" && !isNaN(obj.delaySeconds)
      ? Math.max(0, Math.min(60, Math.round(obj.delaySeconds)))
      : DEFAULT_POPUP.delaySeconds;

  return {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : DEFAULT_POPUP.enabled,
    // Blank rather than the default when the path points off-site: the
    // storefront then falls back to the shop's own mark.
    imageUrl: normalizeSitePath(obj.imageUrl) ?? "",
    imageAlt: clip(obj.imageAlt, MAX_TITLE, DEFAULT_POPUP.imageAlt),
    badgeText: clip(obj.badgeText, MAX_BADGE, DEFAULT_POPUP.badgeText),
    title: clip(obj.title, MAX_TITLE, DEFAULT_POPUP.title),
    description: clip(obj.description, MAX_DESCRIPTION, DEFAULT_POPUP.description),
    couponCode:
      typeof obj.couponCode === "string"
        ? obj.couponCode.trim().toUpperCase().slice(0, MAX_COUPON)
        : DEFAULT_POPUP.couponCode,
    primaryButtonText:
      clip(obj.primaryButtonText, MAX_BUTTON_TEXT, "") || DEFAULT_POPUP.primaryButtonText,
    primaryButtonUrl: normalizeSitePath(obj.primaryButtonUrl) ?? DEFAULT_POPUP.primaryButtonUrl,
    secondaryButtonText:
      clip(obj.secondaryButtonText, MAX_BUTTON_TEXT, "") || DEFAULT_POPUP.secondaryButtonText,
    footerText: clip(obj.footerText, MAX_FOOTER, DEFAULT_POPUP.footerText),
    delaySeconds,
    showFrequency: sanitizeFrequency(obj.showFrequency),
    targetPages: sanitizeTargetPages(obj.targetPages),
  };
}

// Throws on an unreachable database; updatePopupConfigAction reads this
// before writing, so swallowing the error would save defaults over the real
// pop-up. The inner catch stays: unparseable JSON is a corrupt row, not a
// dead database, and falling back beats failing the page over it.
export async function getPopupConfig(): Promise<PopupConfig> {
    const row = await db.siteSetting.findUnique({
      where: { key: POPUP_KEY },
    });

    if (!row?.value) {
      return { ...DEFAULT_POPUP };
    }

    try {
      const parsed = JSON.parse(row.value);
      return sanitizePopupConfig(parsed);
    } catch {
      return { ...DEFAULT_POPUP };
    }
}

/**
 * Cached for the storefront shell, which renders on every page.
 *
 * Site-wide configuration: identical for every visitor, changed only from
 * the admin panel, and updatePopupConfigAction purges this the moment it is
 * saved. The admin panel keeps reading getPopupConfig directly so an
 * editor always sees what they just wrote.
 */
export const getCachedPopupConfig = unstable_cache(
  getPopupConfig,
  ["site-chrome:popup"],
  { revalidate: false, tags: [SITE_CHROME_TAG] },
);
