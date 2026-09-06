import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProductBySlug,
  getProducts,
  getProductsByCategory,
} from "@/lib/products";
import { formatPrice } from "@/lib/format";
import AddToCartButton from "@/components/AddToCartButton";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import ProductDescription from "@/components/ProductDescription";
import ProductVideoPopup from "@/components/ProductVideoPopup";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, jsonLdGraph, productSchema } from "@/lib/structured-data";
import { SITE_NAME, absoluteUrl } from "@/lib/site-config";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// Every page shared one title until this existed, which left search engines
// and answer engines with nothing to tell one product from another.
export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const path = `/products/${product.slug}`;
  const title = `${product.name} — ${product.brand} | ${SITE_NAME}`;
  const description = product.shortDescription;
  const image = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      ...(image ? { images: [{ url: absoluteUrl(image), alt: product.name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [absoluteUrl(image)] } : {}),
    },
  };
}

export default async function ProductPage(
  props: PageProps<"/products/[slug]">,
) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Resolved once and shared by the price block and the buy controls below,
  // so the page cannot show a sale badge next to a disabled button priced
  // from a different number.
  const pricing = resolvePricing(product);
  const availability = resolveAvailability(product);

  const related = (await getProductsByCategory(product.category)).filter(
    (p) => p.id !== product.id,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <JsonLd
        data={jsonLdGraph(
          productSchema(product),
          // Organization is emitted site-wide by the root layout; repeating
          // it here would just duplicate the node.
          breadcrumbSchema([
            { name: "Shop", path: "/products" },
            { name: product.name, path: `/products/${product.slug}` },
          ]),
        )}
      />

      <nav className="text-sm text-black/60 mb-8">
        <Link href="/products" className="hover:text-accent">
          Shop
        </Link>{" "}
        / <span className="text-black/70">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        <ProductGallery
          images={product.images}
          name={product.name}
          videoUrl={product.videoUrl}
        />

        <div>
          <p className="text-xs uppercase tracking-wide text-black/60">
            {product.brand} &middot; SKU {product.sku}
          </p>
          <h1 className="font-display text-4xl tracking-wide mt-1">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {pricing.originalCents !== null && (
              <span className="text-black/60 line-through text-lg">
                {formatPrice(pricing.originalCents)}
              </span>
            )}
            <span className="text-accent font-display text-2xl">
              {formatPrice(pricing.effectiveCents)}
            </span>
            {pricing.onSale && (
              <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded">
                {pricing.percentOff}% OFF
              </span>
            )}
            {!availability.purchasable && (
              <span className="bg-ink text-white text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wide">
                {availability.label}
              </span>
            )}
          </div>

          <ProductDescription
            shortDescription={product.shortDescription}
            descriptionHtml={product.description}
          />

          <ul className="mt-5 space-y-1.5">
            {product.features.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-black/70">
                <span className="text-accent">&#9679;</span>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <ProductVideoPopup product={product} />
          </div>

          <div className="mt-8">
            <AddToCartButton product={product} />
          </div>

          <table className="mt-10 w-full text-sm">
            <tbody>
              {product.specs.map((s) => (
                <tr key={s.label} className="border-b border-black/10">
                  <td className="py-2.5 pr-4 text-black/60 w-1/3">
                    {s.label}
                  </td>
                  <td className="py-2.5 font-medium">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl tracking-wide mb-6">
            COMPLETE THE JOB SITE
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-10">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
