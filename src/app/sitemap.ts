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

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/products?category=${category.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    // The real edit date, so a crawler that has seen the page before can tell
    // whether the price or copy actually moved.
    lastModified: product.updatedAt ?? product.createdAt ?? now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
