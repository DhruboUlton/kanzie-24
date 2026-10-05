import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/products";
import { absoluteUrl } from "@/lib/site-config";

// Built from the catalogue on request rather than checked in, so a product
// added in the admin is listed without a redeploy. Only pages worth landing
// on appear: the cart, checkout and track pages are excluded here for the
// same reason robots.ts disallows them.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  const dateOf = (p: (typeof products)[number]) => p.updatedAt ?? p.createdAt;

  // Listing pages change when a product does, so they take the newest product
  // date. Stamping "now" made every crawl look like an edit and teaches Google
  // to ignore lastmod. changefreq/priority are dropped: Google ignores both.
  const newest = products.map(dateOf).filter((d): d is Date => !!d).sort((a, b) => +b - +a)[0];

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: newest },
    { url: absoluteUrl("/products"), lastModified: newest },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/products?category=${category.slug}`),
    lastModified: newest,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    // The real edit date, so a crawler that has seen the page before can tell
    // whether the price or copy actually moved.
    lastModified: dateOf(product),
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
