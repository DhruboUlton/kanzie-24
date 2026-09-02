// Order statuses and the business rules attached to them, with no database
// import so client components can use them too.
//
// Extracted from src/lib/orders.ts rather than restated: analytics must count
// revenue the same way the order pipeline commits stock, otherwise the two
// screens disagree about what a sale is.

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Statuses where the order's units have already been taken out of stock.
 * PENDING is deliberately absent: an unconfirmed order reserves nothing.
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
  CONFIRMED: "#10b981",
  PACKED: "#3b82f6",
  SHIPPED: "#6366f1",
  DELIVERED: "#16a34a",
  CANCELLED: "#9ca3af",
};

export function isRevenueStatus(status: string): boolean {
  return (REVENUE_STATUSES as string[]).includes(status);
}
