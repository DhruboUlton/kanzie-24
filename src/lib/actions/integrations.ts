"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authErrorResult, requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { isRoleAdmin, ROLE_ADMIN_DENIED } from "@/lib/permissions";
import { getIntegrations } from "@/lib/integrations";
import {
  INTEGRATIONS_SETTING_KEY,
  Integration,
  MAX_CODE_LENGTH,
  MAX_INTEGRATIONS,
  MAX_NAME_LENGTH,
  isPlacement,
  serializeIntegrations,
} from "@/lib/integrations-shared";

type Result = { success: boolean; error?: string };

/**
 * Saving here puts raw script tags on every storefront page, which is the
 * whole point of a pixel — and also the most dangerous thing an admin can
 * do, since a snippet runs with full access to the customer-facing site.
 * So it takes the INTEGRATIONS_MANAGE permission *and* an owner/manager
 * role, the same tier that governs role administration.
 */
export async function saveIntegrationsAction(input: {
  integrations: Integration[];
}): Promise<Result> {
  let ctx;
  try {
    ctx = await requirePermission("INTEGRATIONS_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }
  if (!isRoleAdmin(ctx)) {
    return { success: false, error: ROLE_ADMIN_DENIED };
  }

  const incoming = Array.isArray(input?.integrations) ? input.integrations : [];
  if (incoming.length > MAX_INTEGRATIONS) {
    return {
      success: false,
      error: `That's more than ${MAX_INTEGRATIONS} integrations. Remove a few first.`,
    };
  }

  const cleaned: Integration[] = [];
  const seen = new Set<string>();
  for (const row of incoming) {
    const name = String(row?.name ?? "").trim();
    const code = String(row?.code ?? "");

    if (!name) return { success: false, error: "Give every integration a name." };
    if (name.length > MAX_NAME_LENGTH) {
      return { success: false, error: `"${name.slice(0, 20)}…" — keep names under ${MAX_NAME_LENGTH} characters.` };
    }
    if (!code.trim()) {
      return { success: false, error: `"${name}" has no code in it.` };
    }
    if (code.length > MAX_CODE_LENGTH) {
      return {
        success: false,
        error: `"${name}" is over ${MAX_CODE_LENGTH} characters. Load it from an external file instead.`,
      };
    }
    if (!isPlacement(row?.placement)) {
      return { success: false, error: `"${name}" has an unknown placement.` };
    }

    // Ids only ever come from the editor; regenerate anything unusable so a
    // crafted payload can't collide two rows onto one key.
    let id = typeof row?.id === "string" ? row.id.replace(/[^a-zA-Z0-9_-]/g, "") : "";
    if (!id || seen.has(id)) id = crypto.randomUUID();
    seen.add(id);

    cleaned.push({
      id,
      name,
      placement: row.placement,
      code,
      enabled: row?.enabled !== false,
    });
  }

  try {
    const before = await getIntegrations();
    const value = serializeIntegrations(cleaned);

    await db.siteSetting.upsert({
      where: { key: INTEGRATIONS_SETTING_KEY },
      update: { value },
      create: { key: INTEGRATIONS_SETTING_KEY, value },
    });

    await logActivity({
      actor: ctx,
      action: "INTEGRATIONS_UPDATED",
      entityType: "INTEGRATIONS",
      entityId: INTEGRATIONS_SETTING_KEY,
      // Names and counts only. The snippet bodies are not copied into the
      // audit trail — they can be long, and the log is read on screen.
      description: `Updated storefront integrations (${cleaned.filter((i) => i.enabled).length} of ${cleaned.length} live)`,
      metadata: {
        before: before.map((i) => `${i.name}${i.enabled ? "" : " (off)"}`),
        after: cleaned.map((i) => `${i.name}${i.enabled ? "" : " (off)"}`),
      },
    });

    // The storefront is largely static, so the layout has to be rebuilt for
    // a new tag to appear.
    revalidatePath("/", "layout");
    revalidatePath("/admin/integrations");
    revalidatePath("/admin/activity-log");
    return { success: true };
  } catch (error) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    console.error("saveIntegrations error:", error);
    return { success: false, error: "Couldn't save the integrations." };
  }
}
