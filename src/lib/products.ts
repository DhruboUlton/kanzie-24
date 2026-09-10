import { unstable_cache } from "next/cache";
import { CATALOG_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";

export type Category = {
  id?: string;
  slug: string;
  name: string;
  sortOrder?: number;
  /** Cover image for the homepage tiles. Null = fall back to a product photo. */
  imageUrl?: string | null;
  /** Whether the homepage gives this category a product rail. Nothing else. */
  showOnHomepage?: boolean;
  // Set when this category is a subcategory. Categories nest one level:
  // a parent groups subcategories, and products live on the leaves.
  parentId?: string | null;
  parentSlug?: string | null;
};

// A parent with its subcategories attached, for nav and filter rendering.
export type CategoryNode = Category & { children: Category[] };

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  category: string; // Category["slug"]
  categoryId?: string;
  priceCents: number;
  salePercent?: number | null;
  compareAtPriceCents?: number;
  scale: string;
  shortDescription: string;
  description: string;
  features: string[];
  specs: { label: string; value: string }[];
  images: string[];
  featured: boolean;
  featuredOrder?: number;
  isNew?: boolean;
  categoryOrder?: number;
  inStock: boolean;
  soldOut?: boolean;
  stockQty?: number;
  videoUrl?: string;
  popupVideoUrl?: string;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * How every product list is sorted.
 *
 * The admin's number leads; createdAt breaks ties so an unordered catalogue
 * (every row still at the default 0) keeps showing newest-first exactly as it
 * did before these fields existed; id settles the rest so two products
 * created in the same millisecond cannot swap places between page loads.
 */
const CATEGORY_ORDER = [
  { categoryOrder: "asc" as const },
  { createdAt: "desc" as const },
  { id: "asc" as const },
];

/** Featured ordering is a separate axis — see Product.featuredOrder. */
const FEATURED_ORDER = [
  { featuredOrder: "asc" as const },
  { createdAt: "desc" as const },
  { id: "asc" as const },
];


/**
 * A usable image reference: a root-relative path or an absolute URL.
 *
 * The images column is free-form JSON, and an import once wrote a product's
 * description sentence into it, comma-split into an array. Those strings
 * reach `<Image src>` on every surface that shows the product and throw
 * "Failed to construct 'URL'", taking the whole page down — so anything that
 * isn't addressable is dropped here, at the one place rows are read.
 */
export function isImagePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("/")) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shown where a product has no usable photo. A product can legitimately
 * reach the storefront with none — newly imported, or its list rejected by
 * the guard below — and `<Image>` with no src throws.
 */
export const PRODUCT_IMAGE_PLACEHOLDER = "/kanzie-icon.png";

/** Parses the images column and drops anything unusable. */
export function parseProductImages(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(raw || "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];
  return list.filter(isImagePath);
}

// Helper to normalize Prisma Product record to our Product type
function mapDbProduct(p: any): Product {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    sku: p.sku,
    category: p.category?.slug ?? p.categoryId ?? "",
    categoryId: p.categoryId,
    priceCents: p.priceCents,
    salePercent: p.salePercent ?? null,
    compareAtPriceCents: p.compareAtPriceCents ?? undefined,
    scale: p.scale,
    shortDescription: p.shortDescription,
    description: p.description,
    features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]"),
    specs: Array.isArray(p.specs) ? p.specs : JSON.parse(p.specs || "[]"),
    images: parseProductImages(p.images),
    featured: Boolean(p.featured),
    featuredOrder: p.featuredOrder ?? 0,
    isNew: Boolean(p.isNew),
    categoryOrder: p.categoryOrder ?? 0,
    inStock: Boolean(p.inStock),
    soldOut: Boolean(p.soldOut),
    stockQty: p.stockQty ?? undefined,
    videoUrl: p.videoUrl || undefined,
    popupVideoUrl: p.popupVideoUrl || undefined,
    archivedAt: p.archivedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * These read the catalogue and nothing else: a failed read throws.
 *
 * They used to catch the error and return a hardcoded FALLBACK_PRODUCTS
 * list, which was scaffolding from before the database existed. Fifteen of
 * its slugs matched real products, so a database blip during a rebuild
 * replaced the shop's own catalogue with frozen copies --- stale prices, and
 * inStock hardcoded true on every one, meaning a sold-out product could be
 * sold. An empty result is now returned as an empty list, because a shop
 * with nothing in it is a real answer and inventing stock is not.
 */
export async function getProducts(): Promise<Product[]> {
  const products = await db.product.findMany({
    where: { archivedAt: null },
    include: { category: true },
    orderBy: CATEGORY_ORDER,
  });
  return products.map(mapDbProduct);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await db.product.findMany({
    where: { archivedAt: null, featured: true },
    include: { category: true },
    orderBy: FEATURED_ORDER,
  });
  return products.map(mapDbProduct);
}

export async function getNewArrivals(): Promise<Product[]> {
  const products = await db.product.findMany({
    where: { archivedAt: null, isNew: true },
    include: { category: true },
    orderBy: CATEGORY_ORDER,
  });
  return products.map(mapDbProduct);
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  if (categorySlug === "all") return getProducts();

  // A parent category shows everything filed under its subcategories,
  // since products live on the leaves.
  const products = await db.product.findMany({
    where: {
      archivedAt: null,
      OR: [
        { category: { slug: categorySlug } },
        { category: { parent: { slug: categorySlug } } },
      ],
    },
    include: { category: true },
    orderBy: CATEGORY_ORDER,
  });
  return products.map(mapDbProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  // Missing or archived is undefined, which the page turns into a 404.
  if (!product || product.archivedAt) return undefined;
  return mapDbProduct(product);
}

export async function getCategories(): Promise<Category[]> {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { parent: { select: { slug: true } } },
  });
  return categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    sortOrder: c.sortOrder,
    imageUrl: c.imageUrl,
    showOnHomepage: c.showOnHomepage,
    parentId: c.parentId,
    parentSlug: c.parent?.slug ?? null,
  }));
}

// Top-level categories with their subcategories nested, ordered by
// sortOrder at both levels. Used by the header nav and the shop filter.
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const categories = await getCategories();

  const byOrder = (a: Category, b: Category) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

  return categories
    .filter((c) => !c.parentId)
    .sort(byOrder)
    .map((parent) => ({
      ...parent,
      children: categories
        .filter((c) => c.parentId && c.parentId === parent.id)
        .sort(byOrder),
    }));
}

/**
 * Cached catalogue reads, for the storefront only.
 *
 * The database allows 500 connections an hour, and the shop listing was
 * spending two or three of them per visitor — a few hundred people browsing
 * could exhaust the budget and take checkout down with it. These copies make
 * that cost per-window instead of per-visitor.
 *
 * Safe to serve slightly stale because the catalogue is identical for every
 * visitor and checkout re-reads real stock before writing an order, so a
 * shop window a few minutes behind can never oversell.
 *
 * The admin panel deliberately keeps calling the uncached functions above:
 * an editor has to see what they just saved. For everyone else, each write
 * path calls updateTag(CATALOG_TAG), so an edit replaces these at once
 * rather than waiting out the window.
 */
const CATALOG_CACHE = { revalidate: 1800, tags: [CATALOG_TAG] };

export const getCachedCategories = unstable_cache(
  getCategories,
  ["catalog:categories"],
  CATALOG_CACHE,
);

export const getCachedCategoryTree = unstable_cache(
  getCategoryTree,
  ["catalog:category-tree"],
  CATALOG_CACHE,
);

export const getCachedProductsByCategory = unstable_cache(
  getProductsByCategory,
  ["catalog:products-by-category"],
  CATALOG_CACHE,
);
