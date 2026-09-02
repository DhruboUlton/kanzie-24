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
    const updated = await updateOrderStatus(orderId, status, note, trackingNumber);

    await logActivity({
      actor: ctx,
      action: "ORDER_STATUS_CHANGED",
      entityType: "ORDER",
      entityId: existing?.tranId ?? orderId,
      description: `Order ${existing?.tranId ?? orderId} → ${status}`,
      metadata: { from: existing?.status ?? null, to: status },
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin");
    return { success: true, order: updated };
  } catch (error: any) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    console.error("updateOrderStatus error:", error);
    return { success: false, error: "Couldn't update the order status." };
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
      },
    });

    await logActivity({
      actor: ctx,
      action: "ORDER_NOTE_ADDED",
      entityType: "ORDER",
      entityId: orderId,
      description: "Added a note to the order",
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, event };
  } catch (error: any) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    console.error("addOrderNote error:", error);
    return { success: false, error: "Couldn't add the note." };
  }
}
