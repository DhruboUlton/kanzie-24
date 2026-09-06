import "server-only";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth";
import { AdminContext, Permission } from "@/lib/permissions";

// Page-level guards. These sit alongside — never instead of — the checks in
// the server actions: a page guard controls what renders, the action guard
// controls what happens.

export async function requirePageAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/adpnl/login");
  return ctx;
}

/**
 * Returns the context plus whether this admin holds the permission, so the
 * page can render a "no access" panel inside the normal shell rather than
 * bouncing the user somewhere confusing.
 */
export async function requirePageAccess(
  permission: Permission,
): Promise<{ ctx: AdminContext; allowed: boolean }> {
  const ctx = await requirePageAdmin();
  return { ctx, allowed: ctx.permissions.includes(permission) };
}
