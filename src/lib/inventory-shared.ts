// Pure inventory vocabulary — no database import, so client components can
// use the labels, types and status rules without dragging Prisma into the
// browser bundle. Server-side reads live in src/lib/inventory.ts.

export const LOW_STOCK_SETTING_KEY = "inventory_low_stock_threshold";
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const STOCK_REASONS = [
  "RESTOCK",
  "SALE",
  "RETURN",
  "DAMAGE",
  "LOST",
  "CORRECTION",
] as const;

export type StockReason = (typeof STOCK_REASONS)[number];

export const REASON_LABELS: Record<StockReason, string> = {
  RESTOCK: "Restock — new units received",
  SALE: "Sale — order confirmed",
  RETURN: "Return — units came back",
  DAMAGE: "Damaged — unsellable",
  LOST: "Lost or stolen",
  CORRECTION: "Correction — recount",
};

export const REASON_SHORT: Record<StockReason, string> = {
  RESTOCK: "Restock",
  SALE: "Sale",
  RETURN: "Return",
  DAMAGE: "Damaged",
  LOST: "Lost",
  CORRECTION: "Recount",
};

export function normalizeReason(value: unknown): StockReason {
  return STOCK_REASONS.includes(value as StockReason)
    ? (value as StockReason)
    : "CORRECTION";
}

export type StockStatus = "OVERSOLD" | "OUT" | "LOW" | "OK";

export const STATUS_LABELS: Record<StockStatus, string> = {
  OVERSOLD: "Oversold",
  OUT: "Out of stock",
  LOW: "Low stock",
  OK: "In stock",
};

export function statusOf(
  stockQty: number,
  available: number,
  threshold: number,
): StockStatus {
  // Oversold outranks out-of-stock: both need attention, but only this one
  // means a customer is already waiting for a unit that isn't there.
  if (available < 0) return "OVERSOLD";
  if (stockQty <= 0) return "OUT";
  if (stockQty <= threshold) return "LOW";
  return "OK";
}

export type InventoryRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  image: string | null;
  categoryName: string;
  priceCents: number;
  costPriceCents: number | null;
  stockQty: number;
  // Units inside orders that are placed but not yet confirmed — already
  // promised to a customer, still sitting in stockQty.
  committed: number;
  available: number;
  threshold: number;
  inStock: boolean;
  status: StockStatus;
};

export type InventorySummary = {
  skuCount: number;
  unitCount: number;
  retailValueCents: number;
  costValueCents: number;
  // Cost is optional per product, so say how much of the catalogue the cost
  // figure covers rather than presenting a partial total as a complete one.
  costKnownCount: number;
  lowCount: number;
  outCount: number;
  oversoldCount: number;
  committedUnits: number;
};

export type StockMovementRow = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  delta: number;
  resultQty: number;
  reason: StockReason;
  note: string | null;
  orderId: string | null;
  actorName: string | null;
  createdAt: Date;
};
