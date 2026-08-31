"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  getCourierCredentialsStatus,
  saveCourierCredentials,
  CourierCredentials,
  CourierCredentialsStatus,
} from "@/lib/courier-credentials";

export async function getCourierCredentialsStatusAction(): Promise<CourierCredentialsStatus> {
  await requireAdmin();
  return getCourierCredentialsStatus();
}

export async function updateCourierCredentialsAction(
  input: CourierCredentials,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await saveCourierCredentials(input);
    revalidatePath("/admin/fraud-check");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save credentials" };
  }
}
