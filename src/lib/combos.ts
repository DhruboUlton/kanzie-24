import { db } from "@/lib/db";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";
import {
  calculateComboPrice,
  StorefrontCombo,
  ComboTierSummary,
  ComboEligibleProduct,
} from "@/lib/combos-shared";

export class ComboValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComboValidationError";
  }
}

/**
 * Finds the highest-priority active combo for a product.
 * Returns null if the product is not enrolled in any active combo.
 */
export async function getActiveComboForProduct(
  productId: string,
): Promise<StorefrontCombo | null> {
  const now = new Date();

  // Find active combos containing this product
  const membership = await db.comboProduct.findFirst({
    where: {
      productId,
      combo: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
    },
    orderBy: [
      { combo: { priority: "desc" } },
      { combo: { createdAt: "desc" } },
    ],
    include: {
      combo: {
        include: {
          tiers: {
            orderBy: { quantity: "asc" },
          },
          products: {
            include: {
              product: {
                include: {
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership || !membership.combo || membership.combo.tiers.length === 0) {
    return null;
  }

  const combo = membership.combo;

  const tiers: ComboTierSummary[] = combo.tiers.map((t) => ({
    id: t.id,
    quantity: t.quantity,
    discountPercent: t.discountPercent,
    label: t.label,
    badgeText: t.badgeText,
    subtext: t.subtext,
    isPopular: t.isPopular,
    sortOrder: t.sortOrder,
  }));

  const products: ComboEligibleProduct[] = combo.products
    .filter((cp) => !cp.product.archivedAt)
    .map((cp) => {
      const p = cp.product;
      const pricing = resolvePricing(p);
      const avail = resolveAvailability(p);
      const images = Array.isArray(p.images) ? (p.images as string[]) : [];

      return {
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        priceCents: p.priceCents,
        effectivePriceCents: pricing.effectiveCents,
        image: images[0] || "/placeholder.jpg",
        inStock: avail.purchasable,
        stockQty: p.stockQty,
        categoryName: p.category.name,
      };
    });

  return {
    id: combo.id,
    name: combo.name,
    headline: combo.headline,
    subtext: combo.subtext,
    allowSameProduct: combo.allowSameProduct,
    isActive: combo.isActive,
    tiers,
    products,
  };
}

/**
 * Validates a combo bundle selection completely on the server.
 * Never trusts client price or discount.
 */
export async function validateComboForCheckout(params: {
  comboId: string;
  tierId: string;
  items: { productId: string; qty: number }[];
  /**
   * How many copies of this bundle are being ordered. Stock has to be checked
   * against the whole order, not one bundle: the caller repeats the bundle
   * this many times, so validating a single copy would clear twenty.
   */
  bundleQty?: number;
}) {
  const combo = await db.combo.findUnique({
    where: { id: params.comboId },
    include: {
      tiers: true,
      products: { select: { productId: true } },
    },
  });

  if (!combo || !combo.isActive) {
    throw new ComboValidationError("This combo promotion is not active.");
  }

  const now = new Date();
  if (combo.startDate && combo.startDate > now) {
    throw new ComboValidationError("This combo promotion has not started yet.");
  }
  if (combo.endDate && combo.endDate < now) {
    throw new ComboValidationError("This combo promotion has ended.");
  }

  const tier = combo.tiers.find((t) => t.id === params.tierId);
  if (!tier) {
    throw new ComboValidationError("Selected combo discount tier was not found.");
  }

  const bundleQty = Math.max(1, params.bundleQty ?? 1);
  const totalQty = params.items.reduce((sum, i) => sum + i.qty, 0);
  if (totalQty !== tier.quantity) {
    throw new ComboValidationError(
      `Please select exactly ${tier.quantity} items for the ${tier.label} offer. Received ${totalQty}.`,
    );
  }

  // Counted per product rather than per entry. Comparing entry counts let the
  // same product through as a single line with qty 2, which is two of it --
  // exactly what this setting forbids.
  const qtyByProduct = new Map<string, number>();
  for (const item of params.items) {
    qtyByProduct.set(
      item.productId,
      (qtyByProduct.get(item.productId) ?? 0) + item.qty,
    );
  }

  if (!combo.allowSameProduct) {
    for (const units of qtyByProduct.values()) {
      if (units > 1) {
        throw new ComboValidationError(
          "Duplicate products are not allowed in this combo offer.",
        );
      }
    }
  }

  const eligibleProductIds = new Set(combo.products.map((p) => p.productId));
  for (const item of params.items) {
    if (!eligibleProductIds.has(item.productId)) {
      throw new ComboValidationError("One or more selected products are not eligible for this combo.");
    }
  }

  // Fetch live product records
  const products = await db.product.findMany({
    where: {
      id: { in: params.items.map((i) => i.productId) },
      archivedAt: null,
    },
  });

  if (products.length !== new Set(params.items.map((i) => i.productId)).size) {
    throw new ComboValidationError("One or more products in the combo could not be found.");
  }

  // Stock check
  const productMap = new Map(products.map((p) => [p.id, p]));
  const itemPricesForCalculation: { productId: string; priceCents: number }[] = [];

  for (const item of params.items) {
    const p = productMap.get(item.productId);
    if (!p) throw new ComboValidationError(`Product not found: ${item.productId}`);

    const avail = resolveAvailability(p);
    if (!avail.purchasable) {
      throw new ComboValidationError(`${p.name} is currently ${avail.label.toLowerCase()}.`);
    }

    // Every copy of the bundle, and every entry naming this product, counted
    // together -- a product asked for twice in one bundle needs twice the stock.
    const unitsNeeded = (qtyByProduct.get(p.id) ?? item.qty) * bundleQty;
    if (typeof p.stockQty === "number" && unitsNeeded > p.stockQty) {
      throw new ComboValidationError(
        `Only ${p.stockQty} of ${p.name} available in stock.`,
      );
    }

    const pricing = resolvePricing(p);
    for (let q = 0; q < item.qty; q++) {
      itemPricesForCalculation.push({
        productId: p.id,
        priceCents: pricing.effectiveCents,
      });
    }
  }

  // Calculate combo discounted totals
  const pricing = calculateComboPrice(itemPricesForCalculation, tier.discountPercent);

  return {
    combo,
    tier,
    products: productMap,
    pricing,
  };
}

/**
 * Admin: Get paginated combo list.
 */
export async function getComboList(params?: {
  search?: string;
  status?: string;
  limit?: number;
  skip?: number;
}) {
  const where: Record<string, unknown> = {};

  if (params?.search && params.search.trim()) {
    where.OR = [
      { name: { contains: params.search.trim() } },
      { headline: { contains: params.search.trim() } },
    ];
  }

  if (params?.status === "active") {
    where.isActive = true;
  } else if (params?.status === "inactive") {
    where.isActive = false;
  }

  const [total, combos] = await Promise.all([
    db.combo.count({ where }),
    db.combo.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: params?.limit ?? 50,
      skip: params?.skip ?? 0,
      include: {
        tiers: { orderBy: { quantity: "asc" } },
        _count: {
          select: { products: true },
        },
      },
    }),
  ]);

  return { total, combos };
}

/**
 * Admin: Get full combo with products and tiers for editing.
 */
export async function getComboById(id: string) {
  return db.combo.findUnique({
    where: { id },
    include: {
      tiers: { orderBy: { quantity: "asc" } },
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              slug: true,
              priceCents: true,
              images: true,
              inStock: true,
              stockQty: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * Admin: Fetch all available products for the combo product picker.
 */
export async function getEligibleProductCandidates() {
  return db.product.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      slug: true,
      priceCents: true,
      images: true,
      inStock: true,
      stockQty: true,
      category: { select: { id: true, name: true } },
    },
  });
}
