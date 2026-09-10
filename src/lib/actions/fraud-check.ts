"use server";

import { requireAdmin, authErrorResult } from "@/lib/auth";
import { checkFraud, FraudCheckResult } from "@/lib/fraud-check";

// Any signed-in admin, matching the page. Still requires a session: this
// reaches out to three courier APIs on the shop's account, so it is not
// something an anonymous visitor gets to trigger.
export async function checkFraudAction(
  phone: string,
): Promise<{ success: true; result: FraudCheckResult } | { success: false; error: string }> {
  try {
    await requireAdmin();

    const result = await checkFraud(phone);
    return { success: true, result };
  } catch (error: any) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    return { success: false, error: error?.message || "Failed to run fraud check" };
  }
}
