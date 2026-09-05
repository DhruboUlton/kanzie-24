import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * The transaction-scoped client Prisma hands to $transaction's callback: the
 * full client minus the methods that cannot be nested inside a transaction.
 */
type PrismaTx = Omit<
  typeof db,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
import {
  CouponDiscountType,
  CouponView,
  CouponUsageRowView,
  CouponDashboardMetrics,
  normalizeCouponCode,
  calculateCouponDiscount,
  deriveCouponStatus,
  calculateRemainingUses,
  generateSecureCouponCode,
  CouponError,
} from "./coupons-shared";

export { generateSecureCouponCode };

/**
 * Generates a batch of N unique random coupon codes.
 * Ensures all generated codes in the batch are distinct and checks against existing database codes.
 */
export async function generateUniqueCodesBatch(
  count: number,
  length: number = 8,
): Promise<string[]> {
  const generated = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 20;

  while (generated.size < count && attempts < maxAttempts) {
    attempts++;
    generated.add(generateSecureCouponCode(length));
  }

  const candidateCodes = Array.from(generated);

  try {
    // Check collision against database
    const existing = await db.coupon.findMany({
      where: { code: { in: candidateCodes } },
      select: { code: true },
    });

    const existingSet = new Set(existing.map((c) => c.code));
    const validCodes = new Set(candidateCodes.filter((c) => !existingSet.has(c)));

    // If collisions found with DB, generate additional ones
    while (validCodes.size < count && attempts < maxAttempts * 2) {
      attempts++;
      const extra = generateSecureCouponCode(length);
      if (!existingSet.has(extra)) validCodes.add(extra);
    }

    return Array.from(validCodes).slice(0, count);
  } catch (error) {
    // The caller checks the length and refuses to write a short batch, so
    // failing loudly here beats silently returning codes that were never
    // checked against the table.
    console.error("Coupon code uniqueness check failed:", error);
    throw error;
  }
}

/**
 * Turns a query failure into a line an admin can act on. The overwhelmingly
 * likely cause on a fresh deploy is that `prisma db push` has not been run,
 * so say that rather than "something went wrong".
 */
function describeCouponQueryError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/doesn't exist|does not exist|Unknown table|P2021|no such table/i.test(message)) {
    return "The coupon tables are missing from the database. Run `npx prisma db push` to create them.";
  }
  if (/Environment variable not found|Can't reach database|P1001/i.test(message)) {
    return "Can't reach the database right now. Coupon data is unavailable.";
  }
  return "Couldn't load coupon data. Check the server logs for details.";
}

/**
 * Validates a coupon for checkout application.
 * Recomputes all calculations server-side.
 */
export async function validateCouponForCheckout(
  rawCode: string,
  subtotalCents: number,
): Promise<{
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    discountType: CouponDiscountType;
    discountValue: number;
    discountAmountCents: number;
    finalSubtotalCents: number;
  };
  error?: string;
}> {
  const code = normalizeCouponCode(rawCode);
  if (!code) {
    return { valid: false, error: "Please enter a coupon code." };
  }

  try {
    const coupon = await db.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return { valid: false, error: "Invalid coupon code." };
    }

    if (!coupon.isActive) {
      return { valid: false, error: "This coupon is currently inactive." };
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, error: "This coupon has reached its usage limit." };
    }

    const calc = calculateCouponDiscount({
      subtotalCents,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumOrderAmountCents: coupon.minimumOrderAmountCents,
    });

    if (!calc.eligible) {
      return { valid: false, error: calc.error || "This order is not eligible for this coupon." };
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType as CouponDiscountType,
        discountValue: coupon.discountValue,
        discountAmountCents: calc.discountAmountCents,
        finalSubtotalCents: calc.finalSubtotalCents,
      },
    };
  } catch (error) {
    console.error("Coupon validation error:", error);
    return { valid: false, error: "Unable to validate coupon right now. Please try again." };
  }
}

/**
 * Concurrency-safe coupon redemption.
 * Uses atomic conditional update in MySQL to ensure usageCount never exceeds usageLimit.
 */
export async function redeemCouponInTransaction(
  tx: PrismaTx,
  params: {
    couponId: string;
    orderId: string;
    discountAmountCents: number;
    orderSubtotalCents: number;
    finalOrderAmountCents: number;
    customer?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  },
): Promise<{ success: boolean; couponCode: string; error?: string }> {
  const coupon = await tx.coupon.findUnique({
    where: { id: params.couponId },
  });

  if (!coupon) {
    throw new CouponError("That coupon could not be found.");
  }

  if (!coupon.isActive) {
    throw new CouponError("This coupon is currently inactive.");
  }

  // Atomic conditional increment. The limit is compared against the row's own
  // usageLimit column rather than the value read a moment ago, so an admin
  // lowering the cap mid-flight cannot be raced past. A NULL usageLimit means
  // unlimited, and NULL fails the comparison, hence the explicit IS NULL arm.
  const affected = await tx.$executeRaw`
      UPDATE Coupon
      SET usageCount = usageCount + 1, updatedAt = NOW()
      WHERE id = ${params.couponId}
        AND isActive = 1
        AND (usageLimit IS NULL OR usageCount < usageLimit)
    `;

  if (affected === 0) {
    throw new CouponError(
      coupon.usageLimit === null
        ? "This coupon is no longer active."
        : "This coupon has just reached its usage limit.",
    );
  }

  // Create append-only CouponUsage record
  await tx.couponUsage.create({
    data: {
      couponId: coupon.id,
      couponCode: coupon.code,
      orderId: params.orderId,
      customerName: params.customer?.name ?? null,
      customerEmail: params.customer?.email ?? null,
      customerPhone: params.customer?.phone ?? null,
      discountAmountCents: params.discountAmountCents,
      orderSubtotalCents: params.orderSubtotalCents,
      finalOrderAmountCents: params.finalOrderAmountCents,
    },
  });

  return { success: true, couponCode: coupon.code };
}

/**
 * Hands a coupon redemption back when an order is cancelled.
 *
 * The CouponUsage row is stamped rather than deleted — the audit trail stays
 * append-only — and usageCount comes down so a limited coupon becomes
 * available again. Guarded on the rows that are not already released, so
 * cancelling an order twice can never credit the coupon twice.
 */
export async function releaseCouponForOrder(
  tx: PrismaTx,
  orderId: string,
): Promise<number> {
  const held = await tx.couponUsage.findMany({
    where: { orderId, releasedAt: null },
    select: { id: true, couponId: true },
  });
  if (held.length === 0) return 0;

  await tx.couponUsage.updateMany({
    where: { id: { in: held.map((row) => row.id) } },
    data: { releasedAt: new Date() },
  });

  for (const row of held) {
    // Floor at zero: a count that has already been corrected by hand must not
    // be driven negative by a late cancellation.
    await tx.$executeRaw`
      UPDATE Coupon
      SET usageCount = usageCount - 1, updatedAt = NOW()
      WHERE id = ${row.couponId} AND usageCount > 0
    `;
  }

  return held.length;
}

/**
 * Re-takes a redemption that a cancellation had handed back, for an order
 * moved out of CANCELLED again.
 *
 * Deliberately ignores usageLimit: this redemption already happened and was
 * only released in error, so restoring it is not the same as issuing a new
 * one. The limit governs new customers, not this order's existing claim.
 */
export async function restoreCouponForOrder(
  tx: PrismaTx,
  orderId: string,
): Promise<number> {
  const released = await tx.couponUsage.findMany({
    where: { orderId, releasedAt: { not: null } },
    select: { id: true, couponId: true },
  });
  if (released.length === 0) return 0;

  await tx.couponUsage.updateMany({
    where: { id: { in: released.map((row) => row.id) } },
    data: { releasedAt: null },
  });

  for (const row of released) {
    await tx.$executeRaw`
      UPDATE Coupon
      SET usageCount = usageCount + 1, updatedAt = NOW()
      WHERE id = ${row.couponId}
    `;
  }

  return released.length;
}

/**
 * Aggregates dashboard metrics at database level.
 */
export async function getCouponDashboardMetrics(): Promise<
  CouponDashboardMetrics & { error?: string }
> {
  try {
    const [
      totalCoupons,
      activeCoupons,
      redemptionsAgg,
      topCoupons,
      limitedCoupons,
    ] = await Promise.all([
      db.coupon.count(),
      db.coupon.count({ where: { isActive: true } }),
      db.couponUsage.aggregate({
        // A released redemption was handed back when its order was cancelled;
        // counting it would overstate both redemptions and discount given.
        where: { releasedAt: null },
        _count: { id: true },
        _sum: { discountAmountCents: true },
        _avg: { discountAmountCents: true },
      }),
      db.coupon.findMany({
        where: { usageCount: { gt: 0 } },
        orderBy: { usageCount: "desc" },
        take: 1,
      }),
      db.coupon.findMany({
        where: {
          usageLimit: { not: null },
          isActive: true,
        },
        select: {
          usageLimit: true,
          usageCount: true,
        },
      }),
    ]);

    const totalRedemptions = redemptionsAgg._count.id || 0;
    const totalDiscountGivenCents = redemptionsAgg._sum.discountAmountCents || 0;
    const averageDiscountCents = redemptionsAgg._avg.discountAmountCents
      ? Math.round(redemptionsAgg._avg.discountAmountCents)
      : 0;

    // Near limit: usage >= 80% of limit or <= 2 remaining
    const nearLimitCount = limitedCoupons.filter((c) => {
      if (c.usageLimit === null || c.usageLimit <= 0) return false;
      const consumedRatio = c.usageCount / c.usageLimit;
      const remaining = c.usageLimit - c.usageCount;
      return consumedRatio >= 0.8 || (remaining > 0 && remaining <= 2);
    }).length;

    const mostUsed = topCoupons[0]
      ? {
          code: topCoupons[0].code,
          usageCount: topCoupons[0].usageCount,
          discountType: topCoupons[0].discountType as CouponDiscountType,
          discountValue: topCoupons[0].discountValue,
        }
      : null;

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      totalDiscountGivenCents,
      averageDiscountCents,
      mostUsedCoupon: mostUsed,
      nearLimitCount,
    };
  } catch (error) {
    // Reported rather than swallowed: an empty dashboard and an unreachable
    // (or un-migrated) table look identical otherwise, which is exactly how a
    // missing `prisma db push` reads as a working, empty feature.
    console.error("Coupon dashboard metrics query error:", error);
    return {
      error: describeCouponQueryError(error),
      totalCoupons: 0,
      activeCoupons: 0,
      totalRedemptions: 0,
      totalDiscountGivenCents: 0,
      averageDiscountCents: 0,
      mostUsedCoupon: null,
      nearLimitCount: 0,
    };
  }
}

/**
 * Retrieves coupon list with filtering and search.
 */
export async function getCouponList(options?: {
  search?: string;
  status?: string;
  discountType?: string;
  limit?: number;
  skip?: number;
}): Promise<{ coupons: CouponView[]; total: number; error?: string }> {
  try {
    const where: Prisma.CouponWhereInput = {};

    if (options?.search) {
      const q = options.search.trim();
      // AND-nested rather than a bare OR: the status filter below needs an OR
      // of its own, and two sibling ORs would overwrite each other.
      where.AND = [{ OR: [{ code: { contains: q } }, { note: { contains: q } }] }];
    }

    if (options?.discountType && (options.discountType === "PERCENTAGE" || options.discountType === "FIXED")) {
      where.discountType = options.discountType;
    }

    // "Active" and "Limit Reached" are both isActive, split on whether the cap
    // is spent — a column-to-column comparison, done with a Prisma field
    // reference so the split happens in SQL and the paging count stays true.
    if (options?.status === "inactive") {
      where.isActive = false;
    } else if (options?.status === "active") {
      where.isActive = true;
      where.OR = [
        { usageLimit: null },
        { usageCount: { lt: db.coupon.fields.usageLimit } },
      ];
    } else if (options?.status === "limit-reached") {
      where.isActive = true;
      where.usageLimit = { not: null };
      where.usageCount = { gte: db.coupon.fields.usageLimit };
    }

    const [coupons, total] = await Promise.all([
      db.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.skip ?? 0,
      }),
      db.coupon.count({ where }),
    ]);

    const mapped: CouponView[] = coupons.map((c) => {
      const status = deriveCouponStatus(c.isActive, c.usageLimit, c.usageCount);
      const remainingUses = calculateRemainingUses(c.usageLimit, c.usageCount);
      return {
        id: c.id,
        code: c.code,
        discountType: c.discountType as CouponDiscountType,
        discountValue: c.discountValue,
        minimumOrderAmountCents: c.minimumOrderAmountCents,
        usageLimit: c.usageLimit,
        usageCount: c.usageCount,
        note: c.note,
        isActive: c.isActive,
        status,
        remainingUses,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return { coupons: mapped, total };
  } catch (error) {
    console.error("Coupon list query error:", error);
    return { coupons: [], total: 0, error: describeCouponQueryError(error) };
  }
}

/**
 * Retrieves a single coupon with full detail and redemptions.
 */
export async function getCouponById(
  id: string,
  usageLimitRows: number = 100,
): Promise<{
  coupon: CouponView | null;
  usages: CouponUsageRowView[];
  usageTotal: number;
  error?: string;
}> {
  try {
    const coupon = await db.coupon.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }],
      },
      include: {
        usages: {
          orderBy: { createdAt: "desc" },
          take: usageLimitRows,
          include: {
            order: {
              select: {
                tranId: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!coupon) return { coupon: null, usages: [], usageTotal: 0 };

    // The table shows at most usageLimitRows; the header needs the real count
    // so "showing 100 of 247" can be said out loud instead of implied.
    const usageTotal = await db.couponUsage.count({ where: { couponId: coupon.id } });

    const status = deriveCouponStatus(coupon.isActive, coupon.usageLimit, coupon.usageCount);
    const remainingUses = calculateRemainingUses(coupon.usageLimit, coupon.usageCount);

    const couponView: CouponView = {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType as CouponDiscountType,
      discountValue: coupon.discountValue,
      minimumOrderAmountCents: coupon.minimumOrderAmountCents,
      usageLimit: coupon.usageLimit,
      usageCount: coupon.usageCount,
      note: coupon.note,
      isActive: coupon.isActive,
      status,
      remainingUses,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };

    const usagesView: CouponUsageRowView[] = coupon.usages.map((u) => ({
      id: u.id,
      couponId: u.couponId,
      couponCode: u.couponCode,
      orderId: u.orderId,
      tranId: u.order?.tranId,
      orderStatus: u.order?.status,
      customerName: u.customerName,
      customerEmail: u.customerEmail,
      customerPhone: u.customerPhone,
      discountAmountCents: u.discountAmountCents,
      orderSubtotalCents: u.orderSubtotalCents,
      finalOrderAmountCents: u.finalOrderAmountCents,
      releasedAt: u.releasedAt,
      createdAt: u.createdAt,
    }));

    return { coupon: couponView, usages: usagesView, usageTotal };
  } catch (error) {
    console.error("Get coupon by ID error:", error);
    return { coupon: null, usages: [], usageTotal: 0, error: describeCouponQueryError(error) };
  }
}

/**
 * Global coupon usage history query with URL-based filters.
 */
export async function getCouponUsageHistory(options?: {
  search?: string;
  couponId?: string;
  orderStatus?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  skip?: number;
}): Promise<{ usages: CouponUsageRowView[]; total: number; error?: string }> {
  try {
    const where: Prisma.CouponUsageWhereInput = {};

    if (options?.couponId) {
      where.couponId = options.couponId;
    }

    if (options?.orderStatus) {
      where.order = { status: options.orderStatus };
    }

    if (options?.search) {
      const q = options.search.trim();
      where.OR = [
        { couponCode: { contains: q } },
        { customerName: { contains: q } },
        { customerEmail: { contains: q } },
        { customerPhone: { contains: q } },
        { order: { tranId: { contains: q } } },
      ];
    }

    if (options?.dateFrom || options?.dateTo) {
      where.createdAt = {
        ...(options.dateFrom ? { gte: options.dateFrom } : {}),
        ...(options.dateTo ? { lte: options.dateTo } : {}),
      };
    }

    const [usages, total] = await Promise.all([
      db.couponUsage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.skip ?? 0,
        include: {
          order: {
            select: {
              tranId: true,
              status: true,
            },
          },
        },
      }),
      db.couponUsage.count({ where }),
    ]);

    const mapped: CouponUsageRowView[] = usages.map((u) => ({
      id: u.id,
      couponId: u.couponId,
      couponCode: u.couponCode,
      orderId: u.orderId,
      tranId: u.order?.tranId,
      orderStatus: u.order?.status,
      customerName: u.customerName,
      customerEmail: u.customerEmail,
      customerPhone: u.customerPhone,
      discountAmountCents: u.discountAmountCents,
      orderSubtotalCents: u.orderSubtotalCents,
      finalOrderAmountCents: u.finalOrderAmountCents,
      releasedAt: u.releasedAt,
      createdAt: u.createdAt,
    }));

    return { usages: mapped, total };
  } catch (error) {
    console.error("Coupon usage history query error:", error);
    return { usages: [], total: 0, error: describeCouponQueryError(error) };
  }
}
