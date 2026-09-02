// Third-party tracking snippets — GTM, Meta Pixel, TikTok Pixel, anything
// else the marketing side needs pasted into the storefront.
//
// No database import: the admin editor and the storefront injector are both
// client components and share these types.

export type IntegrationPlacement = "head" | "body_start" | "body_end";

export type Integration = {
  id: string;
  name: string;
  placement: IntegrationPlacement;
  code: string;
  enabled: boolean;
};

/** One SiteSetting row holds the whole list as JSON — no migration needed. */
export const INTEGRATIONS_SETTING_KEY = "integrations";

/**
 * Set beside the session cookie at sign-in and cleared at sign-out. Readable
 * by scripts on purpose — it carries no secret, only "this browser belongs to
 * staff", which is what lets the storefront skip loading trackers for the
 * people who run the shop. The admin panel never renders them at all.
 */
export const STAFF_MARKER_COOKIE = "kanzie_staff";

export const PLACEMENTS: IntegrationPlacement[] = ["head", "body_start", "body_end"];

export const PLACEMENT_LABELS: Record<IntegrationPlacement, string> = {
  head: "Head",
  body_start: "Body — top",
  body_end: "Body — bottom",
};

export const PLACEMENT_HINTS: Record<IntegrationPlacement, string> = {
  head: "Where most tags go: GTM, Meta Pixel, TikTok Pixel base code.",
  body_start: "Right after the page opens. GTM's <noscript> block goes here.",
  body_end: "Last thing on the page. Good for anything that can wait.",
};

export const MAX_INTEGRATIONS = 25;
export const MAX_CODE_LENGTH = 20000;
export const MAX_NAME_LENGTH = 60;

export function isPlacement(value: unknown): value is IntegrationPlacement {
  return typeof value === "string" && (PLACEMENTS as string[]).includes(value);
}

/**
 * Reads the stored JSON back into a list, dropping anything malformed rather
 * than throwing. A bad row must never take the storefront down.
 */
export function parseIntegrations(raw: string | null | undefined): Integration[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: Integration[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || !r.id) continue;
    if (typeof r.code !== "string") continue;
    out.push({
      id: r.id,
      name: typeof r.name === "string" ? r.name.slice(0, MAX_NAME_LENGTH) : "Untitled",
      placement: isPlacement(r.placement) ? r.placement : "head",
      code: r.code.slice(0, MAX_CODE_LENGTH),
      enabled: r.enabled !== false,
    });
    if (out.length >= MAX_INTEGRATIONS) break;
  }
  return out;
}

export function serializeIntegrations(list: Integration[]): string {
  return JSON.stringify(
    list.map((i) => ({
      id: i.id,
      name: i.name,
      placement: i.placement,
      code: i.code,
      enabled: i.enabled,
    })),
  );
}

/** Stable ordering so the injected tags land in a predictable sequence. */
export function byPlacement(
  list: Integration[],
  placement: IntegrationPlacement,
): Integration[] {
  return list.filter((i) => i.placement === placement);
}
