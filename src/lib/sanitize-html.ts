import sanitizeHtml from "sanitize-html";

// Product descriptions are authored with the admin rich-text editor and
// rendered via dangerouslySetInnerHTML on the storefront. Sanitize on write
// (the trust boundary — an admin session, but still attacker-reachable HTML)
// so every reader gets clean markup without re-sanitizing on every render.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
];

export function sanitizeDescriptionHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      }),
    },
  }).trim();
}
