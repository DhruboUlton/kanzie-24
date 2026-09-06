"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { updateOrderStatus } from "@/lib/orders";

export async function updateOrderStatusAction(
  orderId: string,
  status: string,
  note?: string,
  trackingNumber?: string
) {
  // Cancelling is its own permission: an order manager who may move an
  // order forward is not automatically allowed to void it.
  let ctx;
  try {
    ctx =
      status === "CANCELLED"
        ? await requirePermission("ORDERS_CANCEL")
        : await requirePermission("ORDERS_STATUS_CHANGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  try {
    const existing = await db.order.findUnique({
      where: { id: orderId },
      select: { status: true, tranId: true },
    });
    const updated = await updateOrderStatus(orderId, status, note, trackingNumber, {
      id: ctx.id,
      name: ctx.name,
    });

    await logActivity({
      actor: ctx,
      action: "ORDER_STATUS_CHANGED",
      entityType: "ORDER",
      entityId: existing?.tranId ?? orderId,
      description: `Order ${existing?.tranId ?? orderId} → ${status}`,
      metadata: { from: existing?.status ?? null, to: status },
    });
    revalidatePath("/adpnl/orders");
    revalidatePath(`/adpnl/orders/${orderId}`);
    revalidatePath("/adpnl");
    return { success: true, order: updated };
  } catch (error: any) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    console.error("updateOrderStatus error:", error);
    return { success: false, error: "Couldn't update the order status." };
  }
}

/**
 * "I rang the customer" — a step of its own, before they have said yes or no.
 *
 * The pipeline used to jump straight from PENDING to CONFIRMED on one
 * button, which lost the common case: the call happens, and on it the buyer
 * cancels. CALLED records that the conversation took place and who had it,
 * then leaves Confirm and Cancel as the next choice. It commits no stock —
 * see STOCK_COMMITTED_STATUSES — because nothing is agreed yet.
 */
export async function markOrderCalledAction(orderId: string, note?: string) {
  let ctx;
  try {
    ctx = await requirePermission("ORDERS_STATUS_CHANGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  try {
    const existing = await db.order.findUnique({
      where: { id: orderId },
      select: { status: true, tranId: true },
    });
    if (!existing) return { success: false, error: "That order no longer exists." };
    if (existing.status !== "PENDING") {
      return {
        success: false,
        error: `This order is already ${existing.status.toLowerCase()}.`,
      };
    }

    const updated = await updateOrderStatus(
      orderId,
      "CALLED",
      note?.trim() || `Called the customer — ${ctx.name}`,
      undefined,
      { id: ctx.id, name: ctx.name },
    );

    await logActivity({
      actor: ctx,
      action: "ORDER_STATUS_CHANGED",
      entityType: "ORDER",
      entityId: existing.tranId,
      description: `Called the customer about order ${existing.tranId}`,
      metadata: { from: existing.status, to: "CALLED" },
    });

    revalidatePath("/adpnl/orders");
    revalidatePath(`/adpnl/orders/${orderId}`);
    revalidatePath("/adpnl");
    return { success: true, order: updated };
  } catch (error) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    console.error("markOrderCalled error:", error);
    return { success: false, error: "Couldn't record the call." };
  }
}

export async function addOrderNoteAction(orderId: string, note: string) {
  let ctx;
  try {
    ctx = await requirePermission("ORDERS_EDIT");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  if (!note || note.trim().length === 0) {
    return { success: false, error: "Note cannot be empty" };
  }

  try {
    const event = await db.orderEvent.create({
      data: {
        orderId,
        status: "NOTE",
        note: note.trim(),
        actorName: ctx.name,
      },
    });

    await logActivity({
      actor: ctx,
      action: "ORDER_NOTE_ADDED",
      entityType: "ORDER",
      entityId: orderId,
      description: "Added a note to the order",
    });

    revalidatePath(`/adpnl/orders/${orderId}`);
    return { success: true, event };
  } catch (error: any) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    console.error("addOrderNote error:", error);
    return { success: false, error: "Couldn't add the note." };
  }
}
