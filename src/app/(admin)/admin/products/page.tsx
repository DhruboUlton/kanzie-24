import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Search,
  ExternalLink,
  Edit,
  Archive,
  RotateCcw,
  Video,
  Sparkles,
  Package,
  FileSpreadsheet,
  ArrowUpDown,
} from "lucide-react";
import { db } from "@/lib/db";
import { getProducts, getCategories, parseProductImages } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { archiveProductAction, restoreProductAction } from "@/lib/actions/product";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";
import ProductDeleteButton from "@/components/admin/ProductDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage(props: {
  searchParams?: Promise<{ q?: string; category?: string; status?: string }>;
}) {
  const { ctx, allowed } = await requirePageAccess("PRODUCTS_VIEW");
  if (!allowed) return <NoAccess what="the product catalogue" />;

  const canDelete = ctx.permissions.includes("PRODUCTS_DELETE");

  const searchParams = (await props.searchParams) || {};
  const query = searchParams.q?.toLowerCase() || "";
  const categoryFilter = searchParams.category || "all";
  const statusFilter = searchParams.status || "active";

  const categories = await getCategories();

  let products: any[] = [];
  try {
    const dbProducts = await db.product.findMany({
      where: {
        archivedAt: statusFilter === "archived" ? { not: null } : null,
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    products = dbProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      categoryName: p.category?.name || p.categoryId,
      categorySlug: p.category?.slug || "",
      priceCents: p.priceCents,
      scale: p.scale,
      images: parseProductImages(p.images),
      featured: p.featured,
      isNew: p.isNew,
      inStock: p.inStock,
      stockQty: p.stockQty,
      videoUrl: p.videoUrl,
      archivedAt: p.archivedAt,
    }));
  } catch {
    const fallback = await getProducts();
    products = fallback.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      categoryName: p.category,
      categorySlug: p.category,
      priceCents: p.priceCents,
      scale: p.scale,
      images: p.images,
      featured: p.featured,
      isNew: p.isNew,
      inStock: p.inStock,
      stockQty: p.stockQty ?? 10,
      videoUrl: p.videoUrl,
      archivedAt: null,
    }));
  }

  // Filter query in memory
  const filteredProducts = products.filter((p) => {
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter === "all" ||
      p.categorySlug === categoryFilter ||
      p.categoryName.toLowerCase() === categoryFilter.toLowerCase();

    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">RC Vehicles Catalog</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage product descriptions, pricing, media, and inventory stock
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Link
            href="/admin/products/arrange"
            className="justify-center inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold border border-gray-300 rounded-lg shadow-sm transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>Arrange</span>
          </Link>
          <Link
            href="/admin/products/import"
            className="justify-center inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold border border-gray-300 rounded-lg shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import CSV</span>
          </Link>
          <Link
            href="/admin/products/new"
            className="justify-center inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <form method="GET" className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by title, SKU, or brand..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#c0282b]"
          />
        </form>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <span className="shrink-0">Category:</span>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg shrink-0">
              <Link
                href={`/admin/products?status=${statusFilter}`}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors whitespace-nowrap ${
                  categoryFilter === "all"
                    ? "bg-white text-gray-900 font-semibold shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/admin/products?category=${cat.slug}&status=${statusFilter}`}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors whitespace-nowrap ${
                    categoryFilter === cat.slug
                      ? "bg-white text-gray-900 font-semibold shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Archived Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs self-start sm:self-auto shrink-0">
            <Link
              href={`/admin/products?category=${categoryFilter}&status=active`}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === "active"
                  ? "bg-white text-gray-900 font-semibold shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Active
            </Link>
            <Link
              href={`/admin/products?category=${categoryFilter}&status=archived`}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === "archived"
                  ? "bg-white text-gray-900 font-semibold shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Archived
            </Link>
          </div>
        </div>
      </div>

      {/* Product List Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No products found matching the criteria.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (below md) */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredProducts.map((product) => {
                const primaryImg = product.images[0] || "/products-dev/excavators/01.jpg";

                return (
                  <div key={product.id || product.slug} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="relative w-14 h-14 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                        <Image
                          src={primaryImg}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/products/${product.id || product.slug}/edit`}
                          className="font-bold text-gray-900 hover:text-accent transition-colors block text-sm line-clamp-1"
                        >
                          {product.name}
                        </Link>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                          SKU: {product.sku} &middot; {product.brand}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                            {product.categoryName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {product.scale}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                      <div>
                        <span className="font-bold text-gray-900 text-base font-display">
                          {formatPrice(product.priceCents)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            product.inStock && (product.stockQty ?? 1) > 0
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span>{product.stockQty ?? 0} in stock</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1">
                        {product.featured && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Featured</span>
                          </span>
                        )}
                        {product.isNew && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            New
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <Link
                          href={`/products/${product.slug}`}
                          target="_blank"
                          title="View on Live Store"
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/products/${product.id || product.slug}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-md transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Link>

                        {statusFilter === "active" ? (
                          <form
                            action={async () => {
                              "use server";
                              await archiveProductAction(product.id);
                            }}
                          >
                            <button
                              type="submit"
                              title="Archive Product"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <form
                            action={async () => {
                              "use server";
                              await restoreProductAction(product.id);
                            }}
                          >
                            <button
                              type="submit"
                              title="Restore Product"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        )}

                        {canDelete && (
                          <ProductDeleteButton
                            productId={product.id}
                            productName={product.name}
                            compact
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Product</th>
                    <th className="px-6 py-3.5">Category &amp; Scale</th>
                    <th className="px-6 py-3.5">Price</th>
                    <th className="px-6 py-3.5">Inventory</th>
                    <th className="px-6 py-3.5">Badges</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => {
                    const primaryImg = product.images[0] || "/products-dev/excavators/01.jpg";

                    return (
                      <tr
                        key={product.id || product.slug}
                        className="hover:bg-gray-50/70 transition-colors"
                      >
                        {/* Thumbnail & Title */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="relative w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                              <Image
                                src={primaryImg}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/admin/products/${product.id || product.slug}/edit`}
                                className="font-bold text-gray-900 hover:text-accent transition-colors block truncate max-w-xs"
                              >
                                {product.name}
                              </Link>
                              <span className="text-xs text-gray-400 font-mono">
                                SKU: {product.sku} &middot; {product.brand}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category & Scale */}
                        <td className="px-6 py-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            {product.categoryName}
                          </span>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Scale: {product.scale}
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {formatPrice(product.priceCents)}
                        </td>

                        {/* Stock */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                product.inStock && (product.stockQty ?? 1) > 0
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <span className="text-xs font-semibold text-gray-700">
                              {product.stockQty ?? 0} in stock
                            </span>
                          </div>
                        </td>

                        {/* Badges */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {product.featured && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Featured</span>
                              </span>
                            )}
                            {product.isNew && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                New
                              </span>
                            )}
                            {product.videoUrl && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                <Video className="w-2.5 h-2.5" />
                                <span>Video</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/products/${product.slug}`}
                              target="_blank"
                              title="View on Live Store"
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>

                            <Link
                              href={`/admin/products/${product.id || product.slug}/edit`}
                              title="Edit Vehicle"
                              className="p-1.5 text-gray-600 hover:text-accent hover:bg-gray-100 rounded-md transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>

                            {statusFilter === "active" ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await archiveProductAction(product.id);
                                }}
                              >
                                <button
                                  type="submit"
                                  title="Archive Product"
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              </form>
                            ) : (
                              <form
                                action={async () => {
                                  "use server";
                                  await restoreProductAction(product.id);
                                }}
                              >
                                <button
                                  type="submit"
                                  title="Restore Product"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </form>
                            )}

                            {canDelete && (
                              <ProductDeleteButton
                                productId={product.id}
                                productName={product.name}
                                compact
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
