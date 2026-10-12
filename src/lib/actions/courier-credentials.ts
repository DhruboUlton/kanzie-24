"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  getCourierCredentialsStatus,
  saveCourierCredentials,
  CourierCredentials,
  CourierCredentialsStatus,
} from "@/lib/courier-credentials";

// Owner-only, not SETTINGS_MANAGE. These are the shop's merchant logins to
// three courier companies; anyone holding them can sign in as the business.
// Gating on a capability meant an owner could hand them out by ticking a
// box on a custom role without ever intending to — requireOwner() makes
// that unrepresentable.
//
// Callers must handle the throw: running a fraud check does not require
// these, so a non-owner reaching this is a bug in the caller, not a denial
// to render.
export async function getCourierCredentialsStatusAction(): Promise<CourierCredentialsStatus> {
  await requireOwner();
  return getCourierCredentialsStatus();
}

export async function updateCourierCredentialsAction(
  input: CourierCredentials,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requireOwner();
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
          input.steadfastApiKey || input.steadfastSecretKey ? "steadfast" : null,
        ].filter(Boolean),
      },
    });

    revalidatePath("/adpnl/fraud-check");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save credentials" };
  }
}
