import "server-only";
import { db } from "@/lib/db";
import { SITE_NAME } from "@/lib/site-config";

// What the browser tab says and shows: the title, the tagline after it, and
// the favicon. Editable from /admin/settings rather than being a code change.
//
// The favicon deliberately does NOT use Next's app/icon.png file convention.
// That convention injects its own <link rel="icon"> from a file on disk, which
// an admin can't replace at runtime and which would compete with the one built
// here. The former src/app/icon.png now lives at public/kanzie-icon.png and is
// only the default.

export const SITE_IDENTITY_KEYS = {
  tabTitle: "site_tab_title",
  tabTagline: "site_tab_tagline",
  favicon: "site_favicon",
} as const;

export const DEFAULT_TAB_TITLE = SITE_NAME;
export const DEFAULT_TAB_TAGLINE = "RC Construction Vehicles";
export const DEFAULT_FAVICON = "/kanzie-icon.png";

export type SiteIdentity = {
  tabTitle: string;
  tabTagline: string;
  favicon: string;
};

/** What the tab reads, e.g. "KANZIE — RC Construction Vehicles". */
export function composeTabTitle(identity: SiteIdentity): string {
  const title = identity.tabTitle.trim() || DEFAULT_TAB_TITLE;
  const tagline = identity.tabTagline.trim();
  return tagline ? `${title} — ${tagline}` : title;
}

export async function getSiteIdentity(): Promise<SiteIdentity> {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: Object.values(SITE_IDENTITY_KEYS) } },
      select: { key: true, value: true },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));

    // Never blank: a tab needs a name, and a page needs an icon, so an empty
    // value here means "not set" and falls back.
    const required = (key: string, fallback: string) => {
      const value = map.get(key);
      return typeof value === "string" && value.trim() ? value.trim() : fallback;
    };

    // Blank on purpose: the tagline field says "leave empty for the title on
    // its own", so a saved empty string has to mean exactly that. Only an
    // absent row falls back to the default.
    const optional = (key: string, fallback: string) => {
      const value = map.get(key);
      return typeof value === "string" ? value.trim() : fallback;
    };

    return {
      tabTitle: required(SITE_IDENTITY_KEYS.tabTitle, DEFAULT_TAB_TITLE),
      tabTagline: optional(SITE_IDENTITY_KEYS.tabTagline, DEFAULT_TAB_TAGLINE),
      favicon: required(SITE_IDENTITY_KEYS.favicon, DEFAULT_FAVICON),
    };
  } catch {
    // A database that isn't answering must still render a page with a title.
    return {
      tabTitle: DEFAULT_TAB_TITLE,
      tabTagline: DEFAULT_TAB_TAGLINE,
      favicon: DEFAULT_FAVICON,
    };
  }
}
