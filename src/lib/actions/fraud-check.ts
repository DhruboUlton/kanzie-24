"use server";

import { requireAdmin } from "@/lib/auth";
import { checkFraud, FraudCheckResult } from "@/lib/fraud-check";

export async function checkFraudAction(
  phone: string,
): Promise<{ success: true; result: FraudCheckResult } | { success: false; error: string }> {
  await requireAdmin();

  try {
    const result = await checkFraud(phone);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to run fraud check" };
  }
}
