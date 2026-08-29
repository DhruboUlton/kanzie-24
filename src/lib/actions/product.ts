"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { productSchema } from "@/lib/schemas/product";

export async function createProductAction(data: any) {
  await requireAdmin();

  const validated = productSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues.map((i) => i.message).join(", "),
    };
  }

  const {
    name,
    slug,
    brand,
    sku,
    categoryId,
    priceTaka,
    compareAtPriceTaka,
    scale,
    shortDescription,
    description,
    features,
    specs,
    images,
    featured,
    isNew,
    inStock,
    stockQty,
    videoUrl,
  } = validated.data;

  try {
    // Check if slug or SKU exists
    const existing = await db.product.findFirst({
      where: {
        OR: [{ slug }, { sku }],
      },
    });

    if (existing) {
      if (existing.slug === slug) {
        return { success: false, error: "A product with this slug already exists" };
      }
      if (existing.sku === sku) {
        return { success: false, error: "A product with this SKU already exists" };
      }
    }

    const priceCents = Math.round(priceTaka * 100);
    const compareAtPriceCents = compareAtPriceTaka
      ? Math.round(compareAtPriceTaka * 100)
      : null;

    const product = await db.product.create({
      data: {
        name,
        slug,
        brand,
        sku,
        categoryId,
        priceCents,
        compareAtPriceCents,
        scale,
        shortDescription,
        description,
        features: features,
        specs: specs,
        images: images,
        featured,
        isNew,
        inStock,
        stockQty,
        videoUrl: videoUrl || null,
      },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);
    revalidatePath("/admin/products");

    return { success: true, product };
  } catch (error: any) {
    console.error("createProduct error:", error);
    return { success: false, error: error.message || "Failed to create product" };
  }
}

export async function updateProductAction(id: string, data: any) {
  await requireAdmin();

  const validated = productSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues.map((i) => i.message).join(", "),
    };
  }

  const {
    name,
    slug,
    brand,
    sku,
    categoryId,
    priceTaka,
    compareAtPriceTaka,
    scale,
    shortDescription,
    description,
    features,
    specs,
    images,
    featured,
    isNew,
    inStock,
    stockQty,
    videoUrl,
  } = validated.data;

  try {
    // Check conflicts
    const conflict = await db.product.findFirst({
      where: {
        id: { not: id },
        OR: [{ slug }, { sku }],
      },
    });

    if (conflict) {
      if (conflict.slug === slug) {
        return { success: false, error: "Another product with this slug already exists" };
      }
      if (conflict.sku === sku) {
        return { success: false, error: "Another product with this SKU already exists" };
      }
    }

    const priceCents = Math.round(priceTaka * 100);
    const compareAtPriceCents = compareAtPriceTaka
      ? Math.round(compareAtPriceTaka * 100)
      : null;

    const updated = await db.product.update({
      where: { id },
      data: {
        name,
        slug,
        brand,
        sku,
        categoryId,
        priceCents,
        compareAtPriceCents,
        scale,
        shortDescription,
        description,
        features,
        specs,
        images,
        featured,
        isNew,
        inStock,
        stockQty,
        videoUrl: videoUrl || null,
      },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);
    revalidatePath("/admin/products");

    return { success: true, product: updated };
  } catch (error: any) {
    console.error("updateProduct error:", error);
    return { success: false, error: error.message || "Failed to update product" };
  }
}

export async function archiveProductAction(id: string) {
  await requireAdmin();
  try {
    const product = await db.product.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/admin/products");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to archive product" };
  }
}

export async function restoreProductAction(id: string) {
  await requireAdmin();
  try {
    const product = await db.product.update({
      where: { id },
      data: { archivedAt: null },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/admin/products");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore product" };
  }
}
