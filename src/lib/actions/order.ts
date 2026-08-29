"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/orders";

export async function updateOrderStatusAction(
  orderId: string,
  status: string,
  note?: string,
  trackingNumber?: string
) {
  await requireAdmin();

  try {
    const updated = await updateOrderStatus(orderId, status, note, trackingNumber);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin");
    return { success: true, order: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update order status" };
  }
}

export async function addOrderNoteAction(orderId: string, note: string) {
  await requireAdmin();

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

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, event };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to add note" };
  }
}
