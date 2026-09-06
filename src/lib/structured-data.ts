import { Product } from "@/lib/products";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from "@/lib/site-config";

// Machine-readable copies of what the page already says, for search engines
// and for the answer engines that quote them. Prices and availability come
// from resolvePricing/resolveAvailability — the same functions the visible
// price and the buy button use — so the markup cannot advertise a number the
// checkout would refuse.

export const CURRENCY = "BDT";

/** Cents to the decimal string schema.org expects ("5976.00"). */
function priceString(cents: number): string {
  return (cents / 100).toFixed(2);
}

const AVAILABILITY_URL = {
  AVAILABLE: "https://schema.org/InStock",
  OUT_OF_STOCK: "https://schema.org/OutOfStock",
  SOLD_OUT: "https://schema.org/SoldOut",
} as const;

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/kanzie-logo.png"),
    },
  };
}

export function webSiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function productSchema(product: Product, categoryName?: string) {
  const pricing = resolvePricing(product);
  const availability = resolveAvailability(product);
  const url = absoluteUrl(`/products/${product.slug}`);

  return {
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    url,
    // Omitted rather than sent empty when a product has no photo yet:
    // Google requires an image for a product rich result, and an empty
    // array is an invalid answer where no answer is a valid one.
    ...(product.images.length > 0
      ? { image: product.images.map((src) => absoluteUrl(src)) }
      : {}),
    brand: { "@type": "Brand", name: product.brand },
    ...(categoryName ? { category: categoryName } : {}),
    // Scale is the spec buyers actually compare on, so it is worth stating
    // as a property rather than leaving buried in the description.
    additionalProperty: [
      { "@type": "PropertyValue", name: "Scale", value: product.scale },
    ],
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: CURRENCY,
      price: priceString(pricing.effectiveCents),
      availability: AVAILABILITY_URL[availability.status],
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_URL}/#organization` },
    },
  };
}

/** Wraps one or more nodes in a single @graph document. */
export function jsonLdGraph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
