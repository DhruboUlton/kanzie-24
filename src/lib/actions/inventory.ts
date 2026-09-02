"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  LOW_STOCK_SETTING_KEY,
  StockMovementRow,
  getStockMovements,
  normalizeReason,
  recordStockChange,
} from "@/lib/inventory";

type Result = { success: boolean; error?: string };

// Every write revalidates the storefront too — stock drives the ADD TO CART
// button, so a correction that stops at the admin panel is half-applied.
function revalidateStock(slug?: string) {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/products");
  if (slug) revalidatePath(`/products/${slug}`);
}

export async function adjustStockAction(input: {
  productId: string;
  mode: "delta" | "set";
  value: number;
  reason: string;
  note?: string;
}): Promise<Result & { after?: number }> {
  let admin;
  try {
    admin = await requirePermission("INVENTORY_ADJUST");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const value = Math.trunc(Number(input.value));
  if (!Number.isFinite(value)) {
    return { success: false, error: "Enter a whole number." };
  }
  if (input.mode === "delta" && value === 0) {
    return { success: false, error: "Enter an amount to add or remove." };
  }
  if (input.mode === "set" && value < 0) {
    return { success: false, error: "Stock can't be set below zero." };
  }

  try {
    const product = await db.product.findUnique({
      where: { id: input.productId },
      select: { slug: true, stockQty: true },
    });
    if (!product) return { success: false, error: "Product not found" };

    // A relative adjustment that would push the count negative is almost
    // always a typo, so refuse it and say what the stock actually is. A
    // recount ("set") is allowed to land on zero but not below.
    if (input.mode === "delta" && product.stockQty + value < 0) {
      return {
        success: false,
        error: `Only ${product.stockQty} in stock — can't remove ${Math.abs(value)}.`,
      };
    }

    const { after } = await recordStockChange({
      productId: input.productId,
      ...(input.mode === "delta" ? { delta: value } : { setTo: value }),
      reason: normalizeReason(input.reason),
      note: input.note,
      actorName: admin.name || admin.email,
    });

    await logActivity({
      actor: admin,
      action: "INVENTORY_ADJUSTED",
      entityType: "INVENTORY",
      entityId: input.productId,
      description: `Stock ${input.mode === "set" ? "set to" : "changed by"} ${value}`,
      metadata: { mode: input.mode, value, reason: input.reason, after },
    });

    revalidateStock(product.slug);
    return { success: true, after };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to adjust stock" };
  }
}

export async function receiveStockAction(
  lines: { productId: string; qty: number }[],
  note?: string,
): Promise<Result & { received?: number }> {
  let admin;
  try {
    admin = await requirePermission("INVENTORY_ADJUST");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const valid = lines
    .map((l) => ({ productId: l.productId, qty: Math.trunc(Number(l.qty)) }))
    .filter((l) => l.productId && Number.isFinite(l.qty) && l.qty > 0);

  if (valid.length === 0) {
    return { success: false, error: "Enter a quantity for at least one product." };
  }

  try {
    // Sequential rather than parallel: each line is its own transaction, and
    // firing them at once on a shared connection pool gains nothing at this
    // catalogue size while making a partial failure harder to read.
    let received = 0;
    for (const line of valid) {
      await recordStockChange({
        productId: line.productId,
        delta: line.qty,
        reason: "RESTOCK",
        note,
        actorName: admin.name || admin.email,
      });
      received += line.qty;
    }

    await logActivity({
      actor: admin,
      action: "INVENTORY_RECEIVED",
      entityType: "INVENTORY",
      description: `Received ${received} units across ${valid.length} products`,
      metadata: { received, lines: valid.length, note: note || null },
    });

    revalidateStock();
    return { success: true, received };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to receive stock" };
  }
}

export async function updateProductInventorySettingsAction(input: {
  productId: string;
  costTaka: number | null;
  lowStockThreshold: number | null;
}): Promise<Result> {
  let ctx;
  try {
    ctx = await requirePermission("INVENTORY_ADJUST");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const cost =
    input.costTaka === null || input.costTaka === undefined
      ? null
      : Math.round(Number(input.costTaka) * 100);
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
    return { success: false, error: "Cost price must be zero or more." };
  }

  const threshold =
    input.lowStockThreshold === null || input.lowStockThreshold === undefined
      ? null
      : Math.trunc(Number(input.lowStockThreshold));
  if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) {
    return { success: false, error: "Low-stock alert must be zero or more." };
  }

  try {
    await db.product.update({
      where: { id: input.productId },
      data: { costPriceCents: cost, lowStockThreshold: threshold },
    });

    await logActivity({
      actor: ctx,
      action: "INVENTORY_SETTINGS_UPDATED",
      entityType: "INVENTORY",
      entityId: input.productId,
      description: "Updated cost price / low-stock alert",
      metadata: { costPriceCents: cost, lowStockThreshold: threshold },
    });

    revalidateStock();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save" };
  }
}

export async function updateLowStockThresholdAction(
  threshold: number,
): Promise<Result> {
  let ctx;
  try {
    ctx = await requirePermission("INVENTORY_ADJUST");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const n = Math.trunc(Number(threshold));
  if (!Number.isFinite(n) || n < 0) {
    return { success: false, error: "Threshold must be zero or more." };
  }

  try {
    await db.siteSetting.upsert({
      where: { key: LOW_STOCK_SETTING_KEY },
      update: { value: String(n) },
      create: { key: LOW_STOCK_SETTING_KEY, value: String(n) },
    });

    await logActivity({
      actor: ctx,
      action: "INVENTORY_SETTINGS_UPDATED",
      entityType: "INVENTORY",
      description: `Store-wide low-stock alert set to ${n}`,
      metadata: { threshold: n },
    });

    revalidateStock();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save threshold" };
  }
}

export async function getProductMovementsAction(
  productId: string,
): Promise<StockMovementRow[]> {
  await requirePermission("INVENTORY_VIEW");
  return getStockMovements({ productId, limit: 50 });
}
