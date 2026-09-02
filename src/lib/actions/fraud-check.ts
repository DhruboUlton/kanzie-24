"use server";

import { requirePermission, authErrorResult } from "@/lib/auth";
import { checkFraud, FraudCheckResult } from "@/lib/fraud-check";

export async function checkFraudAction(
  phone: string,
): Promise<{ success: true; result: FraudCheckResult } | { success: false; error: string }> {
  try {
    await requirePermission("FRAUD_CHECK_VIEW");

    const result = await checkFraud(phone);
    return { success: true, result };
  } catch (error: any) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    return { success: false, error: error?.message || "Failed to run fraud check" };
  }
}
