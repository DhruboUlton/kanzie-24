"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authErrorResult, requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const tierSchema = z.object({
  id: z.string().optional(),
  quantity: z.number().int().min(2, "Tier quantity must be at least 2."),
  discountPercent: z.number().int().min(1, "Discount percent must be at least 1%.").max(100, "Discount cannot exceed 100%."),
  label: z.string().trim().min(1, "Tier label is required.").max(50),
  badgeText: z.string().trim().min(1, "Badge text is required.").max(50),
  subtext: z.string().trim().max(100).optional().nullable(),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const comboInputSchema = z.object({
  name: z.string().trim().min(2, "Combo name must be at least 2 characters.").max(100),
  headline: z.string().trim().min(1, "Promotional headline is required.").max(100),
  subtext: z.string().trim().max(200).optional().nullable(),
  allowSameProduct: z.boolean().default(true),
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
  productIds: z.array(z.string()).min(1, "Select at least one eligible product for this combo."),
  tiers: z.array(tierSchema).min(1, "Configure at least one discount tier (e.g. Buy 2 for 20% off)."),
}).refine(
  (data) => {
    // Quantities must be unique within a combo
    const quantities = data.tiers.map((t) => t.quantity);
    return new Set(quantities).size === quantities.length;
  },
  {
    message: "Each discount tier must have a unique quantity.",
    path: ["tiers"],
  },
);

export type ComboFormValues = z.infer<typeof comboInputSchema>;

// Every write below has to reach the storefront, not just the admin list.
// A combo is *displayed* on /products/[slug], which is prerendered from
// generateStaticParams with `revalidate = 1800`, so without an explicit
// invalidation a new or edited offer stays invisible for up to half an hour
// after it is saved.
//
// The "(storefront)" route group is load-bearing: revalidatePath matches on
// the route file structure rather than the public URL, and the bare
// "/products/[slug]" pattern silently matches nothing — the call succeeds and
// every product page keeps serving its pre-change copy.
function revalidateComboSurfaces(id?: string) {
  revalidatePath("/adpnl/combos");
  if (id) revalidatePath(`/adpnl/combos/${id}`);
  revalidatePath("/products");
  revalidatePath("/(storefront)/products/[slug]", "page");
}

export async function createComboAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("COMBOS_MANAGE");

    const parsed = comboInputSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid combo configuration." };
    }

    const { productIds, tiers, ...comboData } = parsed.data;

    const combo = await db.$transaction(async (tx) => {
      const created = await tx.combo.create({
        data: {
          ...comboData,
          products: {
            create: productIds.map((productId) => ({ productId })),
          },
          tiers: {
            create: tiers.map((t, idx) => ({
              quantity: t.quantity,
              discountPercent: t.discountPercent,
              label: t.label,
              badgeText: t.badgeText,
              subtext: t.subtext || null,
              isPopular: t.isPopular,
              sortOrder: t.sortOrder ?? idx,
            })),
          },
        },
      });

      return created;
    });

    await logActivity({
      actor: ctx,
      action: "COMBO_CREATED",
      entityType: "COMBO",
      entityId: combo.id,
      description: `Created combo promotion "${combo.name}" with ${tiers.length} tiers and ${productIds.length} eligible products.`,
    });

    revalidateComboSurfaces();
    return { success: true, data: { id: combo.id } };
  } catch (error) {
    const authErr = authErrorResult(error);
    if (authErr) return authErr;
    console.error("Failed to create combo:", error);
    return { success: false, error: "Failed to create combo offer. Please try again." };
  }
}

export async function updateComboAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("COMBOS_MANAGE");

    const parsed = comboInputSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid combo configuration." };
    }

    const { productIds, tiers, ...comboData } = parsed.data;

    await db.$transaction(async (tx) => {
      // 1. Update master combo fields
      await tx.combo.update({
        where: { id },
        data: comboData,
      });

      // 2. Replace products
      await tx.comboProduct.deleteMany({ where: { comboId: id } });
      await tx.comboProduct.createMany({
        data: productIds.map((productId) => ({ comboId: id, productId })),
      });

      // 3. Reconcile tiers, keyed on quantity rather than replaced wholesale.
      //
      // They used to be deleted and recreated on every save, which minted a
      // new id for each tier each time. A cart carries the id of the tier the
      // customer picked, so editing a combo -- even only to fix a typo in its
      // subtext -- invalidated every cart holding it, and checkout then
      // refused with "Selected combo discount tier was not found" on a basket
      // that still looked fine. Quantity is what actually identifies an offer,
      // so keying on it lets an edit keep the ids it can. A tier whose
      // quantity is genuinely no longer offered is still removed, and a cart
      // pointing at that one is meant to fail.
      const offeredQuantities = tiers.map((t) => t.quantity);
      await tx.comboTier.deleteMany({
        where: { comboId: id, quantity: { notIn: offeredQuantities } },
      });

      for (const [idx, t] of tiers.entries()) {
        const fields = {
          discountPercent: t.discountPercent,
          label: t.label,
          badgeText: t.badgeText,
          subtext: t.subtext || null,
          isPopular: t.isPopular,
          sortOrder: t.sortOrder ?? idx,
        };
        await tx.comboTier.upsert({
          where: { comboId_quantity: { comboId: id, quantity: t.quantity } },
          create: { comboId: id, quantity: t.quantity, ...fields },
          update: fields,
        });
      }
    });

    await logActivity({
      actor: ctx,
      action: "COMBO_UPDATED",
      entityType: "COMBO",
      entityId: id,
      description: `Updated combo promotion "${comboData.name}".`,
    });

    revalidateComboSurfaces(id);
    return { success: true, data: { id } };
  } catch (error) {
    const authErr = authErrorResult(error);
    if (authErr) return authErr;
    console.error("Failed to update combo:", error);
    return { success: false, error: "Failed to update combo offer. Please try again." };
  }
}

export async function deleteComboAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("COMBOS_MANAGE");

    const existing = await db.combo.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Combo not found." };

    await db.combo.delete({ where: { id } });

    await logActivity({
      actor: ctx,
      action: "COMBO_DELETED",
      entityType: "COMBO",
      entityId: id,
      description: `Deleted combo promotion "${existing.name}".`,
    });

    revalidateComboSurfaces();
    return { success: true };
  } catch (error) {
    const authErr = authErrorResult(error);
    if (authErr) return authErr;
    console.error("Failed to delete combo:", error);
    return { success: false, error: "Failed to delete combo offer." };
  }
}

export async function toggleComboActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("COMBOS_MANAGE");

    const updated = await db.combo.update({
      where: { id },
      data: { isActive },
    });

    await logActivity({
      actor: ctx,
      action: "COMBO_STATUS_TOGGLED",
      entityType: "COMBO",
      entityId: id,
      description: `${isActive ? "Activated" : "Deactivated"} combo promotion "${updated.name}".`,
    });

    revalidateComboSurfaces(id);
    return { success: true };
  } catch (error) {
    const authErr = authErrorResult(error);
    if (authErr) return authErr;
    console.error("Failed to toggle combo status:", error);
    return { success: false, error: "Failed to toggle combo status." };
  }
}
