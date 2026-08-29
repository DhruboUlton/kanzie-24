import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCategories, getProductBySlug } from "@/lib/products";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const categories = await getCategories();

  let product: any = null;

  try {
    product = await db.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: { category: true },
    });

    if (product) {
      product = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        categoryId: product.categoryId,
        priceCents: product.priceCents,
        compareAtPriceCents: product.compareAtPriceCents,
        scale: product.scale,
        shortDescription: product.shortDescription,
        description: product.description,
        features: Array.isArray(product.features)
          ? product.features
          : JSON.parse(product.features as string || "[]"),
        specs: Array.isArray(product.specs)
          ? product.specs
          : JSON.parse(product.specs as string || "[]"),
        images: Array.isArray(product.images)
          ? product.images
          : JSON.parse(product.images as string || "[]"),
        featured: product.featured,
        isNew: product.isNew,
        inStock: product.inStock,
        stockQty: product.stockQty,
        videoUrl: product.videoUrl,
      };
    }
  } catch {
    // fallback lookup
    const fallback = await getProductBySlug(id);
    if (fallback) {
      product = {
        ...fallback,
        categoryId: categories.find((c) => c.slug === fallback.category)?.id || fallback.category,
      };
    }
  }

  if (!product) {
    notFound();
  }

  return (
    <div>
      <ProductForm initialData={product} categories={categories} isEdit={true} />
    </div>
  );
}
