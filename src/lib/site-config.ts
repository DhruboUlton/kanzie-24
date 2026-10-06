// Placeholder brand name — change here to rebrand the whole site (header,
// footer, page titles all read from this).
export const SITE_NAME = "KANZIE";
export const SITE_TAGLINE = "Remote control heavy equipment for real diggers.";
export const SUPPORT_EMAIL = "info@kanzie.shop";

export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/kanzieshop",
  instagram: "https://www.instagram.com/kanzie___/",
} as const;

// Absolute origin, needed wherever a relative path is not allowed: canonical
// links, sitemap entries, Open Graph images and JSON-LD ids. Overridable so a
// staging deploy does not advertise the production domain as its canonical.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://kanzie.shop"
).replace(/\/$/, "");

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return path.startsWith("http")
    ? path
    : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
