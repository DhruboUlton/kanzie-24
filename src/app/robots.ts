import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

// Paths that are either private or meaningless to a crawler: the admin, the
// API surface, and the pages that only make sense mid-purchase. Keeping them
// out of the index also keeps them out of an answer engine's summary of the
// store.
const DISALLOWED = ["/admin", "/api", "/cart", "/checkout", "/track"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Named explicitly rather than relying on the wildcard: several AI
        // crawlers ignore a bare "*" when deciding whether they may quote a
        // page, and being citable is the point.
        userAgent: [
          "*",
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot-Extended",
          "CCBot",
          "Bingbot",
          "meta-externalagent",
        ],
        allow: "/",
        disallow: DISALLOWED,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
