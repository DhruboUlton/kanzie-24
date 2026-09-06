import { getCategories, getProducts } from "@/lib/products";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from "@/lib/site-config";

// https://llmstxt.org — a plain-text brief for language models, in the same
// spirit as robots.txt. Where the JSON-LD states facts for a parser, this
// states them in prose an assistant can quote when asked what the store
// sells and what it costs.
//
// Generated from the catalogue for the same reason the sitemap is: a price
// or a product that only exists in a checked-in file goes stale silently,
// and a confidently quoted stale price is worse than no answer.

export const dynamic = "force-dynamic";

function taka(cents: number): string {
  return `BDT ${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export async function GET() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_TAGLINE} ${SITE_NAME} is an online shop in Bangladesh selling remote-control construction vehicles — excavators, bulldozers, dump trucks and similar machines — priced in Bangladeshi taka (BDT).`,
    "",
    `Website: ${SITE_URL}`,
    "",
    "## Notes",
    "",
    "- Prices below are current at the time this file was served and already include any running discount.",
    "- Availability changes with stock; the product page is authoritative.",
    "- Orders are placed on the website. Payment is arranged after an order is confirmed by phone.",
    "",
    "## Categories",
    "",
  ];

  for (const category of categories) {
    lines.push(
      `- [${category.name}](${absoluteUrl(`/products?category=${category.slug}`)})`,
    );
  }

  lines.push("", "## Products", "");

  for (const product of products) {
    const pricing = resolvePricing(product);
    const availability = resolveAvailability(product);
    // originalCents, not regularCents: on a compare-at markdown the regular
    // price IS what is charged, so quoting it as the was-price prints the
    // same number twice and claims a discount off itself.
    const price =
      pricing.onSale && pricing.originalCents !== null
        ? `${taka(pricing.effectiveCents)} (${pricing.percentOff}% off ${taka(pricing.originalCents)})`
        : taka(pricing.effectiveCents);

    lines.push(
      `- [${product.name}](${absoluteUrl(`/products/${product.slug}`)}) — ${product.brand}, scale ${product.scale}. ${price}. ${availability.label}. ${product.shortDescription}`,
    );
  }

  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Short: this carries live prices, and a day-old cached price is a
      // wrong answer rather than a stale page.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
