"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  getCourierCredentialsStatus,
  saveCourierCredentials,
  CourierCredentials,
  CourierCredentialsStatus,
} from "@/lib/courier-credentials";

export async function getCourierCredentialsStatusAction(): Promise<CourierCredentialsStatus> {
  await requirePermission("SETTINGS_MANAGE");
  return getCourierCredentialsStatus();
}

export async function updateCourierCredentialsAction(
  input: CourierCredentials,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission("SETTINGS_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  try {
    await saveCourierCredentials(input);

    // Which couriers were touched, never the values themselves.
    await logActivity({
      actor: ctx,
      action: "COURIER_CREDENTIALS_UPDATED",
      entityType: "SETTINGS",
      description: "Updated courier merchant logins",
      metadata: {
        couriers: [
          input.pathaoUser !== undefined || input.pathaoPassword ? "pathao" : null,
          input.redxPhone !== undefined || input.redxPassword ? "redx" : null,
          input.steadfastUser !== undefined || input.steadfastPassword ? "steadfast" : null,
        ].filter(Boolean),
      },
    });

    revalidatePath("/adpnl/fraud-check");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save credentials" };
  }
}
