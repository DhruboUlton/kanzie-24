"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authErrorResult, requireRoleAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  AdminContext,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  Permission,
  sanitizePermissions,
} from "@/lib/permissions";

type Result = { success: boolean; error?: string };

/**
 * A role editor can only hand out what they already hold.
 *
 * ROLES_MANAGE on its own used to be a route to everything: edit your own
 * role, tick STAFF_EDIT, and the next request lets you reset the owner's
 * password. Owners hold every permission, so this never constrains them —
 * it only stops a delegate from writing themselves a bigger role than the
 * one they were given.
 */
function ungrantable(ctx: AdminContext, permissions: Permission[]): string | null {
  if (ctx.roleKey === OWNER_ROLE_KEY) return null;
  const beyond = permissions.filter((p) => !ctx.permissions.includes(p));
  if (beyond.length === 0) return null;
  const names = beyond.map((p) => `"${PERMISSIONS[p]}"`).join(", ");
  return `You can only grant permissions you hold yourself. Ask an owner about: ${names}.`;
}

function revalidateRoles() {
  revalidatePath("/admin/roles");
  revalidatePath("/admin/staff");
  revalidatePath("/admin/activity-log");
}

const roleSchema = z.object({
  name: z.string().trim().min(2, "Enter a role name.").max(60),
  description: z.string().trim().max(300).optional(),
  permissions: z.array(z.string()),
});

export async function createRoleAction(input: {
  name: string;
  description?: string;
  permissions: string[];
}): Promise<Result> {
  try {
    const ctx = await requireRoleAdmin("ROLES_MANAGE");

    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Custom roles get a key derived from their name; system keys are
    // reserved so a custom role can never impersonate OWNER.
    const base = parsed.data.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!base) return { success: false, error: "Enter a role name with letters or numbers." };

    let key = base;
    for (let i = 2; await db.role.findUnique({ where: { key } }); i++) {
      key = `${base}_${i}`;
    }

    const permissions = sanitizePermissions(parsed.data.permissions);
    if (permissions.length === 0) {
      return { success: false, error: "Give the role at least one permission." };
    }

    const denied = ungrantable(ctx, permissions);
    if (denied) return { success: false, error: denied };

    const created = await db.role.create({
      data: {
        key,
        name: parsed.data.name,
        description: parsed.data.description || null,
        isSystem: false,
        permissions: permissions as never,
      },
    });

    await logActivity({
      actor: ctx,
      action: "ROLE_CREATED",
      entityType: "ROLE",
      entityId: created.id,
      description: `Created role ${created.name}`,
      metadata: { key, permissions },
    });

    revalidateRoles();
    return { success: true };
  } catch (error) {
    return handle(error, "Couldn't create the role.");
  }
}

export async function updateRoleAction(input: {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}): Promise<Result> {
  try {
    const ctx = await requireRoleAdmin("ROLES_MANAGE");

    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const role = await db.role.findUnique({ where: { id: input.id } });
    if (!role) return { success: false, error: "That role no longer exists." };

    // OWNER's permission set is fixed in code — it always holds everything,
    // so editing it here would be a lie the UI couldn't honour.
    if (role.key === OWNER_ROLE_KEY) {
      return {
        success: false,
        error: "The Owner role always has every permission and can't be edited.",
      };
    }

    const permissions = sanitizePermissions(parsed.data.permissions);
    if (permissions.length === 0) {
      return { success: false, error: "Give the role at least one permission." };
    }

    // Only what this edit *adds* is checked. Saving a role that already holds
    // a permission the editor lacks — a rename, say — stays possible; growing
    // it beyond the editor's own grant does not.
    const before = sanitizePermissions(role.permissions);
    const denied = ungrantable(
      ctx,
      permissions.filter((p) => !before.includes(p)),
    );
    if (denied) return { success: false, error: denied };

    await db.role.update({
      where: { id: role.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        permissions: permissions as never,
      },
    });

    const added = permissions.filter((p) => !before.includes(p));
    const removed = before.filter((p) => !permissions.includes(p));

    await logActivity({
      actor: ctx,
      action: "ROLE_UPDATED",
      entityType: "ROLE",
      entityId: role.id,
      description: `Updated role ${parsed.data.name}`,
      metadata: {
        key: role.key,
        ...(added.length ? { added } : {}),
        ...(removed.length ? { removed } : {}),
      },
    });

    revalidateRoles();
    return { success: true };
  } catch (error) {
    return handle(error, "Couldn't update the role.");
  }
}

export async function deleteRoleAction(id: string): Promise<Result> {
  try {
    const ctx = await requireRoleAdmin("ROLES_MANAGE");

    const role = await db.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) return { success: false, error: "That role no longer exists." };

    if (role.isSystem) {
      return { success: false, error: "Built-in roles can't be deleted." };
    }
    if (role._count.users > 0) {
      return {
        success: false,
        error: `${role._count.users} staff still use this role. Move them to another role first.`,
      };
    }

    await db.role.delete({ where: { id } });

    await logActivity({
      actor: ctx,
      action: "ROLE_DELETED",
      entityType: "ROLE",
      entityId: id,
      description: `Deleted role ${role.name}`,
      metadata: { key: role.key },
    });

    revalidateRoles();
    return { success: true };
  } catch (error) {
    return handle(error, "Couldn't delete the role.");
  }
}

function handle(error: unknown, fallback: string): Result {
  const denied = authErrorResult(error);
  if (denied) return denied;
  console.error("Role action error:", error);
  return { success: false, error: fallback };
}
