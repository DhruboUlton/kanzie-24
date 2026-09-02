import { db } from "@/lib/db";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  InventoryRow,
  InventorySummary,
  LOW_STOCK_SETTING_KEY,
  StockMovementRow,
  StockReason,
  normalizeReason,
  statusOf,
} from "@/lib/inventory-shared";

// Server-side inventory reads and the one mutation every stock change goes
// through. Product.stockQty stays the live count; StockMovement is the
// append-only record of how it got there.

export * from "@/lib/inventory-shared";

// Stock is only deducted when an admin confirms an order by phone, so
// everything still PENDING is spoken for but not yet taken out of stock.
// That gap is what "committed" measures.
const COMMITTING_STATUSES = ["PENDING"];

export async function getLowStockThreshold(): Promise<number> {
  try {
    const row = await db.siteSetting.findUnique({
      where: { key: LOW_STOCK_SETTING_KEY },
    });
    const n = Number(row?.value);
    if (!Number.isFinite(n) || n < 0) return DEFAULT_LOW_STOCK_THRESHOLD;
    return Math.min(9999, Math.floor(n));
  } catch {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
}

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const first = images.find((i) => typeof i === "string" && i.trim());
  return typeof first === "string" ? first : null;
}

export async function getInventory(): Promise<{
  rows: InventoryRow[];
  summary: InventorySummary;
  threshold: number;
}> {
  const threshold = await getLowStockThreshold();

  const [products, pendingItems] = await Promise.all([
    db.product.findMany({
      where: { archivedAt: null },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    db.orderItem.findMany({
      where: { order: { status: { in: COMMITTING_STATUSES } } },
      select: { productId: true, qty: true },
    }),
  ]);

  const committedByProduct = new Map<string, number>();
  for (const item of pendingItems) {
    if (!item.productId) continue;
    committedByProduct.set(
      item.productId,
      (committedByProduct.get(item.productId) ?? 0) + item.qty,
    );
  }

  const rows: InventoryRow[] = products.map((p) => {
    const committed = committedByProduct.get(p.id) ?? 0;
    const rowThreshold = p.lowStockThreshold ?? threshold;
    const available = p.stockQty - committed;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      brand: p.brand,
      image: firstImage(p.images),
      categoryName: p.category?.name ?? "—",
      priceCents: p.priceCents,
      costPriceCents: p.costPriceCents ?? null,
      stockQty: p.stockQty,
      committed,
      available,
      threshold: rowThreshold,
      inStock: p.inStock,
      status: statusOf(p.stockQty, available, rowThreshold),
    };
  });

  const summary: InventorySummary = {
    skuCount: rows.length,
    unitCount: 0,
    retailValueCents: 0,
    costValueCents: 0,
    costKnownCount: 0,
    lowCount: 0,
    outCount: 0,
    oversoldCount: 0,
    committedUnits: 0,
  };

  for (const r of rows) {
    // Negative stock is a data error, not negative value — don't let it
    // quietly subtract from the totals.
    const units = Math.max(0, r.stockQty);
    summary.unitCount += units;
    summary.retailValueCents += units * r.priceCents;
    summary.committedUnits += r.committed;
    if (r.costPriceCents != null) {
      summary.costValueCents += units * r.costPriceCents;
      summary.costKnownCount++;
    }
    if (r.status === "LOW") summary.lowCount++;
    if (r.status === "OUT") summary.outCount++;
    if (r.status === "OVERSOLD") summary.oversoldCount++;
  }

  return { rows, summary, threshold };
}

export async function getStockMovements(options?: {
  productId?: string;
  limit?: number;
}): Promise<StockMovementRow[]> {
  const movements = await db.stockMovement.findMany({
    where: options?.productId ? { productId: options.productId } : undefined,
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 100,
  });

  return movements.map((m) => ({
    id: m.id,
    productId: m.productId,
    productName: m.product?.name ?? "Deleted product",
    productSku: m.product?.sku ?? "—",
    delta: m.delta,
    resultQty: m.resultQty,
    reason: normalizeReason(m.reason),
    note: m.note,
    orderId: m.orderId,
    actorName: m.actorName,
    createdAt: m.createdAt,
  }));
}

export type StockChange = {
  productId: string;
  // Either move by `delta`, or land exactly on `setTo` — the second is what
  // a physical recount produces, and computing the delta here keeps the
  // audit trail honest about what actually changed.
  delta?: number;
  setTo?: number;
  reason: StockReason;
  note?: string;
  orderId?: string;
  actorName?: string;
};

/**
 * The single path every stock change takes. Runs in a transaction so the
 * count, the sellable flag and the audit row can never disagree, and reads
 * the current quantity inside that transaction so two concurrent
 * adjustments can't both write from the same stale number.
 */
export async function recordStockChange(
  change: StockChange,
): Promise<{ before: number; after: number }> {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: change.productId },
      select: { id: true, stockQty: true },
    });
    if (!product) throw new Error("Product not found");

    const before = product.stockQty;
    const after =
      change.setTo !== undefined
        ? Math.trunc(change.setTo)
        : before + Math.trunc(change.delta ?? 0);
    const delta = after - before;

    await tx.product.update({
      where: { id: product.id },
      data: {
        stockQty: after,
        // Keep the storefront's sellable flag honest: nothing at zero or
        // below should still show an ADD TO CART button, and a restock
        // should put the product back on sale without a second click.
        inStock: after > 0,
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        delta,
        resultQty: after,
        reason: change.reason,
        note: change.note?.trim() || null,
        orderId: change.orderId ?? null,
        actorName: change.actorName ?? "System",
      },
    });

    return { before, after };
  });
}
