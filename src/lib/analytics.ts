import "server-only";
import { db } from "@/lib/db";
import { REVENUE_STATUSES } from "@/lib/order-status";
import {
  CategorySlice,
  DateRange,
  Granularity,
  MovementPoint,
  ProductSlice,
  StatusSlice,
  TimePoint,
  Totals,
  granularityFor,
} from "@/lib/analytics-shared";
import { STOCK_REASONS } from "@/lib/inventory-shared";
import { STORE_UTC_OFFSET_HOURS, storeParts } from "@/lib/datetime";

// Every figure on the analytics page is aggregated in MySQL. Nothing pulls a
// table into Node to add it up, so the page cost stays flat as orders grow.
//
// COST / PROFIT LIMITATION — read before trusting any profit number.
// OrderItem snapshots the *selling* price at the time of sale but not the
// cost. Product.costPriceCents is today's cost, so profit here is
// "revenue minus what those units would cost to buy today", not historical
// margin. Change a cost price and every past month's profit moves. The
// figure is therefore reported alongside the share of revenue it actually
// covers, and callers that can't show that caveat should not show profit.

const REVENUE_STATUS_LIST = REVENUE_STATUSES as string[];

// Timestamps are stored in UTC but the shop's day runs on Bangladesh time,
// so an evening order would otherwise land in the next day's bucket. The
// offset is fixed at +6: Bangladesh has never used daylight saving, and a
// literal beats CONVERT_TZ, which needs timezone tables shared hosting
// usually hasn't loaded.
const STORE_OFFSET_SQL = `INTERVAL ${STORE_UTC_OFFSET_HOURS} HOUR`;

function bucketExpr(granularity: Granularity, column: string) {
  const local = `${column} + ${STORE_OFFSET_SQL}`;
  return granularity === "month"
    ? `DATE_FORMAT(${local}, '%Y-%m')`
    : `DATE_FORMAT(${local}, '%Y-%m-%d')`;
}

function labelFor(bucket: string, granularity: Granularity) {
  // Built and formatted in UTC so the label always matches the bucket key,
  // whatever timezone the process happens to run in.
  if (granularity === "month") {
    const [y, m] = bucket.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
      timeZone: "UTC",
      month: "short",
      year: "numeric",
    });
  }
  const [y, m, d] = bucket.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  });
}

/** Every bucket in the range, so quiet days render as zero instead of vanishing. */
function emptyBuckets(range: DateRange, granularity: Granularity): string[] {
  const out: string[] = [];
  const pad = (n: number) => String(n).padStart(2, "0");
  let cursor = new Date(range.from);

  if (granularity === "month") {
    const seen = new Set<string>();
    while (cursor <= range.to) {
      const { year, month } = storeParts(cursor);
      const key = `${year}-${pad(month + 1)}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
  } else {
    while (cursor <= range.to) {
      const { year, month, day } = storeParts(cursor);
      out.push(`${year}-${pad(month + 1)}-${pad(day)}`);
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
  }
  return out;
}

type RawSeriesRow = {
  bucket: string;
  revenue: bigint | number | null;
  orders: bigint | number | null;
};
type RawItemRow = {
  bucket: string;
  units: bigint | number | null;
  cost: bigint | number | null;
  costed_revenue: bigint | number | null;
};
type RawStatusRow = { bucket: string; status: string; orders: bigint | number | null };

const num = (v: bigint | number | null | undefined) => Number(v ?? 0);

export async function getTimeSeries(range: DateRange): Promise<TimePoint[]> {
  const granularity = granularityFor(range);

  // Three passes rather than one: order totals, item-level units and cost,
  // and status counts have different grains, and joining them in a single
  // query would multiply order totals by their line count.
  const [orderRows, itemRows, statusRows] = await Promise.all([
    db.$queryRawUnsafe<RawSeriesRow[]>(
      `SELECT ${bucketExpr(granularity, "createdAt")} AS bucket,
              SUM(totalAmountCents) AS revenue,
              COUNT(*) AS orders
         FROM \`Order\`
        WHERE createdAt BETWEEN ? AND ?
          AND status IN (${REVENUE_STATUS_LIST.map(() => "?").join(",")})
        GROUP BY bucket`,
      range.from,
      range.to,
      ...REVENUE_STATUS_LIST,
    ),
    db.$queryRawUnsafe<RawItemRow[]>(
      `SELECT ${bucketExpr(granularity, "o.createdAt")} AS bucket,
              SUM(oi.qty) AS units,
              SUM(CASE WHEN p.costPriceCents IS NOT NULL
                       THEN oi.qty * p.costPriceCents END) AS cost,
              SUM(CASE WHEN p.costPriceCents IS NOT NULL
                       THEN oi.totalPriceCents END) AS costed_revenue
         FROM \`OrderItem\` oi
         JOIN \`Order\` o ON o.id = oi.orderId
         LEFT JOIN \`Product\` p ON p.id = oi.productId
        WHERE o.createdAt BETWEEN ? AND ?
          AND o.status IN (${REVENUE_STATUS_LIST.map(() => "?").join(",")})
        GROUP BY bucket`,
      range.from,
      range.to,
      ...REVENUE_STATUS_LIST,
    ),
    db.$queryRawUnsafe<RawStatusRow[]>(
      `SELECT ${bucketExpr(granularity, "createdAt")} AS bucket,
              status,
              COUNT(*) AS orders
         FROM \`Order\`
        WHERE createdAt BETWEEN ? AND ?
        GROUP BY bucket, status`,
      range.from,
      range.to,
    ),
  ]);

  const byBucket = new Map<string, TimePoint>();
  for (const bucket of emptyBuckets(range, granularity)) {
    byBucket.set(bucket, {
      bucket,
      label: labelFor(bucket, granularity),
      revenueCents: 0,
      orders: 0,
      units: 0,
      delivered: 0,
      cancelled: 0,
      profitCents: null,
    });
  }

  for (const r of orderRows) {
    const point = byBucket.get(r.bucket);
    if (!point) continue;
    point.revenueCents = num(r.revenue);
    point.orders = num(r.orders);
  }
  for (const r of itemRows) {
    const point = byBucket.get(r.bucket);
    if (!point) continue;
    point.units = num(r.units);
    // Profit only where a cost exists, measured against the revenue of just
    // those lines — mixing in uncosted revenue would overstate margin.
    const costedRevenue = num(r.costed_revenue);
    point.profitCents = costedRevenue > 0 ? costedRevenue - num(r.cost) : null;
  }
  for (const r of statusRows) {
    const point = byBucket.get(r.bucket);
    if (!point) continue;
    if (r.status === "DELIVERED") point.delivered = num(r.orders);
    if (r.status === "CANCELLED") point.cancelled = num(r.orders);
  }

  return [...byBucket.values()];
}

export async function getTotals(range: DateRange): Promise<Totals> {
  const [revenueRow, statusRows, itemRow] = await Promise.all([
    db.$queryRawUnsafe<{ revenue: bigint | null; orders: bigint | null }[]>(
      `SELECT SUM(totalAmountCents) AS revenue, COUNT(*) AS orders
         FROM \`Order\`
        WHERE createdAt BETWEEN ? AND ?
          AND status IN (${REVENUE_STATUS_LIST.map(() => "?").join(",")})`,
      range.from,
      range.to,
      ...REVENUE_STATUS_LIST,
    ),
    db.$queryRawUnsafe<{ status: string; orders: bigint | null }[]>(
      `SELECT status, COUNT(*) AS orders
         FROM \`Order\`
        WHERE createdAt BETWEEN ? AND ?
        GROUP BY status`,
      range.from,
      range.to,
    ),
    db.$queryRawUnsafe<
      { units: bigint | null; cost: bigint | null; costed_revenue: bigint | null }[]
    >(
      `SELECT SUM(oi.qty) AS units,
              SUM(CASE WHEN p.costPriceCents IS NOT NULL
                       THEN oi.qty * p.costPriceCents END) AS cost,
              SUM(CASE WHEN p.costPriceCents IS NOT NULL
                       THEN oi.totalPriceCents END) AS costed_revenue
         FROM \`OrderItem\` oi
         JOIN \`Order\` o ON o.id = oi.orderId
         LEFT JOIN \`Product\` p ON p.id = oi.productId
        WHERE o.createdAt BETWEEN ? AND ?
          AND o.status IN (${REVENUE_STATUS_LIST.map(() => "?").join(",")})`,
      range.from,
      range.to,
      ...REVENUE_STATUS_LIST,
    ),
  ]);

  const revenueCents = num(revenueRow[0]?.revenue);
  const orders = num(revenueRow[0]?.orders);
  const byStatus = new Map(statusRows.map((r) => [r.status, num(r.orders)]));
  const costedRevenue = num(itemRow[0]?.costed_revenue);

  return {
    revenueCents,
    orders,
    units: num(itemRow[0]?.units),
    aovCents: orders > 0 ? Math.round(revenueCents / orders) : 0,
    delivered: byStatus.get("DELIVERED") ?? 0,
    pending: byStatus.get("PENDING") ?? 0,
    cancelled: byStatus.get("CANCELLED") ?? 0,
    profitCents: costedRevenue > 0 ? costedRevenue - num(itemRow[0]?.cost) : null,
    profitCoverageRevenueCents: costedRevenue,
  };
}

export async function getStatusBreakdown(range: DateRange): Promise<StatusSlice[]> {
  const rows = await db.$queryRawUnsafe<
    { status: string; count: bigint | null; revenue: bigint | null }[]
  >(
    `SELECT status, COUNT(*) AS count, SUM(totalAmountCents) AS revenue
       FROM \`Order\`
      WHERE createdAt BETWEEN ? AND ?
      GROUP BY status`,
    range.from,
    range.to,
  );
  return rows
    .map((r) => ({
      status: r.status,
      count: num(r.count),
      revenueCents: num(r.revenue),
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getTopProducts(
  range: DateRange,
  limit = 10,
): Promise<{ byUnits: ProductSlice[]; byRevenue: ProductSlice[] }> {
  // Grouped on the snapshot name/SKU, not the product row, so items whose
  // product was since deleted still appear under what was actually sold.
  const rows = await db.$queryRawUnsafe<
    {
      productId: string | null;
      productName: string;
      productSku: string;
      units: bigint | null;
      revenue: bigint | null;
    }[]
  >(
    `SELECT MAX(oi.productId) AS productId,
            oi.productName,
            oi.productSku,
            SUM(oi.qty) AS units,
            SUM(oi.totalPriceCents) AS revenue
       FROM \`OrderItem\` oi
       JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.createdAt BETWEEN ? AND ?
        AND o.status IN (${REVENUE_STATUS_LIST.map(() => "?").join(",")})
      GROUP BY oi.productSku, oi.productName`,
    range.from,
    range.to,
    ...REVENUE_STATUS_LIST,
  );

  const slices: ProductSlice[] = rows.map((r) => ({
    id: r.productId,
    name: r.productName,
    sku: r.productSku,
    units: num(r.units),
    revenueCents: num(r.revenue),
  }));

  return {
    byUnits: [...slices].sort((a, b) => b.units - a.units).slice(0, limit),
    byRevenue: [...slices]
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, limit),
  };
}

export async function getCategoryPerformance(
  range: DateRange,
): Promise<CategorySlice[]> {
  // Archived products keep their category, so their sales still count. Items
  // whose product row is gone have no category and are grouped separately
  // rather than silently dropped.
  const rows = await db.$queryRawUnsafe<
    { name: string | null; units: bigint | null; revenue: bigint | null }[]
  >(
    `SELECT c.name AS name,
            SUM(oi.qty) AS units,
            SUM(oi.totalPriceCents) AS revenue
       FROM \`OrderItem\` oi
       JOIN \`Order\` o ON o.id = oi.orderId
       LEFT JOIN \`Product\` p ON p.id = oi.productId
       LEFT JOIN \`Category\` c ON c.id = p.categoryId
      WHERE o.createdAt BETWEEN ? AND ?
        AND o.status IN (${REVENUE_STATUS_LIST.map(() => "?").join(",")})
      GROUP BY c.name`,
    range.from,
    range.to,
    ...REVENUE_STATUS_LIST,
  );

  return rows
    .map((r) => ({
      name: r.name ?? "Uncategorised",
      units: num(r.units),
      revenueCents: num(r.revenue),
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);
}

export async function getStockMovementSeries(
  range: DateRange,
): Promise<{ points: MovementPoint[]; reasons: string[] }> {
  const granularity = granularityFor(range);

  // Kept per reason: a restock and a sale are opposite events, and summing
  // them into one "movement" line would say nothing useful.
  const rows = await db.$queryRawUnsafe<
    { bucket: string; reason: string; qty: bigint | null }[]
  >(
    `SELECT ${bucketExpr(granularity, "createdAt")} AS bucket,
            reason,
            SUM(ABS(delta)) AS qty
       FROM \`StockMovement\`
      WHERE createdAt BETWEEN ? AND ?
      GROUP BY bucket, reason`,
    range.from,
    range.to,
  );

  const present = new Set(rows.map((r) => r.reason));
  const reasons = STOCK_REASONS.filter((r) => present.has(r));

  const byBucket = new Map<string, MovementPoint>();
  for (const bucket of emptyBuckets(range, granularity)) {
    const point: MovementPoint = { bucket, label: labelFor(bucket, granularity) };
    for (const reason of reasons) point[reason] = 0;
    byBucket.set(bucket, point);
  }
  for (const r of rows) {
    const point = byBucket.get(r.bucket);
    if (point) point[r.reason] = num(r.qty);
  }

  return { points: [...byBucket.values()], reasons: [...reasons] };
}

/**
 * How much of the catalogue has a cost price. Without this the profit
 * section would look authoritative while covering a fraction of sales.
 */
export async function getCostCoverage(): Promise<{
  withCost: number;
  total: number;
}> {
  const [withCost, total] = await Promise.all([
    db.product.count({ where: { archivedAt: null, costPriceCents: { not: null } } }),
    db.product.count({ where: { archivedAt: null } }),
  ]);
  return { withCost, total };
}
