// Order statuses and the business rules attached to them, with no database
// import so client components can use them too.
//
// Extracted from src/lib/orders.ts rather than restated: analytics must count
// revenue the same way the order pipeline commits stock, otherwise the two
// screens disagree about what a sale is.

export const ORDER_STATUSES = [
  "PENDING",
  "CALLED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Statuses where the order's units have already been taken out of stock.
 * PENDING and CALLED are deliberately absent: ringing the customer is not
 * the same as them agreeing, and an unconfirmed order reserves nothing.
 */
export const STOCK_COMMITTED_STATUSES: OrderStatus[] = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];

/**
 * What counts as money earned. There is no payment gateway — an order
 * becomes real when an admin phones the customer and confirms it — so
 * revenue tracks exactly the statuses that commit stock. PENDING is not yet
 * a sale and CANCELLED never was.
 */
export const REVENUE_STATUSES: OrderStatus[] = STOCK_COMMITTED_STATUSES;

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "#f59e0b",
  CALLED: "#0ea5e9",
  CONFIRMED: "#10b981",
  PACKED: "#3b82f6",
  SHIPPED: "#6366f1",
  DELIVERED: "#16a34a",
  CANCELLED: "#9ca3af",
};

export function isRevenueStatus(status: string): boolean {
  return (REVENUE_STATUSES as string[]).includes(status);
}

/** Shared badge styling, so the list and the detail page never disagree. */
export const ORDER_STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CALLED: "bg-sky-50 text-sky-700 border-sky-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PACKED: "bg-blue-50 text-blue-700 border-blue-200",
  SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Call",
  CALLED: "Called",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};


// ── What the customer sees ─────────────────────────────────────────────
//
// The internal pipeline has seven states; the public one has five. CALLED
// is deliberately folded into "Order Processing": that we rang someone is
// our business, and until they say yes the order has not moved on as far
// as they are concerned.

export const PUBLIC_STAGES = [
  {
    key: "processing",
    label: "Order Processing",
    blurb: "We have your order and will call to confirm it.",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    blurb: "You confirmed the order on the phone. We're getting it ready.",
  },
  {
    key: "packed",
    label: "Packed",
    blurb: "Boxed and waiting for the courier to collect it.",
  },
  {
    key: "shipped",
    label: "Shipped",
    blurb: "On its way to you. Pay cash when it arrives.",
  },
  {
    key: "delivered",
    label: "Delivered",
    blurb: "Handed over. Thanks for shopping with us.",
  },
] as const;

export type PublicStage = (typeof PUBLIC_STAGES)[number]["key"];

const PUBLIC_STAGE_BY_STATUS: Record<string, PublicStage> = {
  PENDING: "processing",
  CALLED: "processing",
  CONFIRMED: "confirmed",
  PACKED: "packed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
};

/** Null for a cancelled order — it is off the ladder, not at a point on it. */
export function publicStageFor(status: string): PublicStage | null {
  if (status === "CANCELLED") return null;
  return PUBLIC_STAGE_BY_STATUS[status] ?? "processing";
}

export function publicStageIndex(stage: PublicStage): number {
  return PUBLIC_STAGES.findIndex((s) => s.key === stage);
}
