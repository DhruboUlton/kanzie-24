"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { authErrorResult, requireOwner, requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  generateUniqueCodesBatch,
} from "@/lib/coupons";
import { normalizeCouponCode } from "@/lib/coupons-shared";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const customCouponSchema = z.object({
  code: z
    .string()
    .trim()
    // Six, not two: /api/coupons/validate is public and unthrottled, and a
    // two-character code is about 1,300 guesses — trivially enumerable. Six
    // takes it past two billion, in line with the generated 8-character ones.
    .min(6, "Coupon code must be at least 6 characters.")
    .max(32, "Coupon code cannot exceed 32 characters.")
    .regex(/^[A-Za-z0-9_-]+$/, "Code may only contain letters, numbers, hyphens, and underscores."),
  discountType: z.enum(["PERCENTAGE", "FIXED"], {
    message: "Invalid discount type.",
  }),
  discountValue: z
    .number()
    .int("Discount value must be a whole number.")
    .positive("Discount value must be greater than zero."),
  minimumOrderAmountCents: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional(),
  usageLimit: z
    .number()
    .int()
    .positive("Usage limit must be at least 1.")
    .nullable()
    .optional(),
  note: z.string().trim().max(500).optional().nullable(),
}).refine(
  (data) => {
    if (data.discountType === "PERCENTAGE") {
      return data.discountValue >= 1 && data.discountValue <= 100;
    }
    return true;
  },
  {
    message: "Percentage discount must be between 1% and 100%.",
    path: ["discountValue"],
  },
);

const randomBatchSchema = z.object({
  quantity: z
    .number()
    .int("Quantity must be an integer.")
    .min(1, "Generate at least 1 coupon.")
    .max(500, "Maximum batch size is 500 coupons."),
  discountType: z.enum(["PERCENTAGE", "FIXED"], {
    message: "Invalid discount type.",
  }),
  discountValue: z
    .number()
    .int()
    .positive("Discount value must be greater than zero."),
  minimumOrderAmountCents: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional(),
  usageLimit: z
    .number()
    .int()
    .positive("Usage limit must be at least 1.")
    .nullable()
    .optional(),
  note: z.string().trim().max(500).optional().nullable(),
}).refine(
  (data) => {
    if (data.discountType === "PERCENTAGE") {
      return data.discountValue >= 1 && data.discountValue <= 100;
    }
    return true;
  },
  {
    message: "Percentage discount must be between 1% and 100%.",
    path: ["discountValue"],
  },
);

/**
 * Creates a single custom coupon.
 * RESTRICTED TO OWNER ROLE ONLY (enforced server-side).
 */
export async function createCustomCouponAction(
  input: z.infer<typeof customCouponSchema>,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const ctx = await requireOwner();

    const parsed = customCouponSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const normalizedCode = normalizeCouponCode(parsed.data.code);

    const existing = await db.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      return { success: false, error: `Coupon code "${normalizedCode}" already exists.` };
    }

    const created = await db.coupon.create({
      data: {
        code: normalizedCode,
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountValue,
        minimumOrderAmountCents: parsed.data.minimumOrderAmountCents ?? null,
        usageLimit: parsed.data.usageLimit ?? null,
        usageCount: 0,
        note: parsed.data.note?.trim() || null,
        isActive: true,
      },
    });

    await logActivity({
      actor: ctx,
      action: "COUPON_CREATED",
      entityType: "COUPON",
      entityId: created.id,
      description: `Created coupon ${created.code}`,
      metadata: {
        code: created.code,
        discountType: created.discountType,
        discountValue: created.discountValue,
        usageLimit: created.usageLimit,
      },
    });

    revalidatePath("/admin/coupons");
    return { success: true, data: { id: created.id, code: created.code } };
  } catch (error) {
    const authError = authErrorResult(error);
    if (authError) return authError;
    console.error("Create coupon error:", error);
    return { success: false, error: "Failed to create coupon." };
  }
}

/**
 * Generates a batch of N unique random coupons.
 * RESTRICTED TO OWNER ROLE ONLY (enforced server-side).
 * Each generated coupon gets its own independent database record and usage limit.
 */
export async function generateRandomCouponsAction(
  input: z.infer<typeof randomBatchSchema>,
): Promise<ActionResult<{ count: number; codesSample: string[] }>> {
  try {
    const ctx = await requireOwner();

    const parsed = randomBatchSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { quantity, discountType, discountValue, minimumOrderAmountCents, usageLimit, note } =
      parsed.data;

    // Generate unique random codes
    const codes = await generateUniqueCodesBatch(quantity, 8);
    if (codes.length < quantity) {
      return {
        success: false,
        error: `Could only generate ${codes.length} unique codes. Please try again.`,
      };
    }

    const rows = codes.map((code) => ({
      code,
      discountType,
      discountValue,
      minimumOrderAmountCents: minimumOrderAmountCents ?? null,
      usageLimit: usageLimit ?? null,
      usageCount: 0,
      note: note?.trim() || null,
      isActive: true,
    }));

    await db.coupon.createMany({
      data: rows,
    });

    await logActivity({
      actor: ctx,
      action: "COUPONS_BATCH_GENERATED",
      entityType: "COUPON",
      description: `Generated ${quantity} random coupons`,
      metadata: {
        quantity,
        discountType,
        discountValue,
        usageLimit,
        note,
      },
    });

    revalidatePath("/admin/coupons");
    return {
      success: true,
      data: {
        count: codes.length,
        codesSample: codes.slice(0, 5),
      },
    };
  } catch (error) {
    const authError = authErrorResult(error);
    if (authError) return authError;
    console.error("Batch generate coupons error:", error);
    return { success: false, error: "Failed to generate random coupons." };
  }
}

/**
 * Toggles a coupon's active/inactive state.
 * Requires COUPONS_MANAGE permission.
 */
export async function toggleCouponActiveAction(
  couponId: string,
): Promise<ActionResult<{ isActive: boolean }>> {
  try {
    const ctx = await requirePermission("COUPONS_MANAGE");

    const existing = await db.coupon.findUnique({
      where: { id: couponId },
    });

    if (!existing) {
      return { success: false, error: "Coupon not found." };
    }

    const updated = await db.coupon.update({
      where: { id: couponId },
      data: { isActive: !existing.isActive },
    });

    await logActivity({
      actor: ctx,
      action: "COUPON_STATUS_TOGGLED",
      entityType: "COUPON",
      entityId: updated.id,
      description: `${updated.isActive ? "Activated" : "Deactivated"} coupon ${updated.code}`,
      metadata: { code: updated.code, isActive: updated.isActive },
    });

    revalidatePath("/admin/coupons");
    revalidatePath(`/admin/coupons/${couponId}`);
    return { success: true, data: { isActive: updated.isActive } };
  } catch (error) {
    const authError = authErrorResult(error);
    if (authError) return authError;
    console.error("Toggle coupon status error:", error);
    return { success: false, error: "Failed to update coupon status." };
  }
}

const updateCouponSchema = z.object({
  note: z.string().trim().max(500).optional().nullable(),
  usageLimit: z
    .number()
    .int()
    .positive("Usage limit must be at least 1.")
    .nullable()
    .optional(),
});

/**
 * Updates a coupon's note and/or usage limit.
 * If usage limit is increased, an exhausted coupon becomes available again.
 * Historical usage count is never reset.
 * Requires COUPONS_MANAGE permission.
 */
export async function updateCouponAction(
  couponId: string,
  input: z.infer<typeof updateCouponSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("COUPONS_MANAGE");

    const parsed = updateCouponSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await db.coupon.findUnique({
      where: { id: couponId },
    });

    if (!existing) {
      return { success: false, error: "Coupon not found." };
    }

    const data: Prisma.CouponUpdateInput = {};
    if (parsed.data.note !== undefined) {
      data.note = parsed.data.note?.trim() || null;
    }
    if (parsed.data.usageLimit !== undefined) {
      data.usageLimit = parsed.data.usageLimit;
    }

    const updated = await db.coupon.update({
      where: { id: couponId },
      data,
    });

    await logActivity({
      actor: ctx,
      action: "COUPON_UPDATED",
      entityType: "COUPON",
      entityId: updated.id,
      description: `Updated coupon ${updated.code}`,
      metadata: { code: updated.code, changes: data },
    });

    revalidatePath("/admin/coupons");
    revalidatePath(`/admin/coupons/${couponId}`);
    return { success: true };
  } catch (error) {
    const authError = authErrorResult(error);
    if (authError) return authError;
    console.error("Update coupon error:", error);
    return { success: false, error: "Failed to update coupon." };
  }
}
