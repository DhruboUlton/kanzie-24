"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authErrorResult, requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { assertNotLastOwner } from "@/lib/staff";
import { OWNER_ROLE_KEY } from "@/lib/permissions";

type Result = { success: boolean; error?: string };

function revalidateStaff() {
  revalidatePath("/admin/staff");
  revalidatePath("/admin/activity-log");
}

// Shared shape errors. Kept generic on purpose — nothing here should tell a
// caller whether an address belongs to an existing account beyond what the
// staff list already shows them.
const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");
const passwordSchema = z.string().min(10, "Use at least 10 characters.");

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80),
  email: emailSchema,
  password: passwordSchema,
  roleId: z.string().min(1, "Choose a role."),
});

export async function createStaffAction(input: {
  name: string;
  email: string;
  password: string;
  roleId: string;
}): Promise<Result> {
  try {
    const ctx = await requirePermission("STAFF_CREATE");

    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const role = await db.role.findUnique({ where: { id: parsed.data.roleId } });
    if (!role) return { success: false, error: "That role no longer exists." };

    const existing = await db.adminUser.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return { success: false, error: "A staff account with that email already exists." };
    }

    const created = await db.adminUser.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        roleId: role.id,
        isActive: true,
      },
    });

    await logActivity({
      actor: ctx,
      action: "STAFF_CREATED",
      entityType: "STAFF",
      entityId: created.id,
      description: `Created ${created.email}`,
      metadata: { email: created.email, role: role.key },
    });

    revalidateStaff();
    return { success: true };
  } catch (error) {
    return handle(error, "Couldn't create the staff account.");
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Enter a name.").max(80),
  email: emailSchema,
  roleId: z.string().min(1, "Choose a role."),
});

export async function updateStaffAction(input: {
  id: string;
  name: string;
  email: string;
  roleId: string;
}): Promise<Result> {
  try {
    const ctx = await requirePermission("STAFF_EDIT");

    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await db.adminUser.findUnique({
      where: { id: parsed.data.id },
      include: { role: true },
    });
    if (!user) return { success: false, error: "That staff account no longer exists." };

    // Moving the only owner onto another role would lock everyone out of
    // staff management, so it is refused regardless of who asks.
    if (user.role?.key === OWNER_ROLE_KEY && parsed.data.roleId !== user.roleId) {
      await assertNotLastOwner(user.id, "change the role of");
    }

    const role = await db.role.findUnique({ where: { id: parsed.data.roleId } });
    if (!role) return { success: false, error: "That role no longer exists." };

    const clash = await db.adminUser.findFirst({
      where: { email: parsed.data.email, id: { not: user.id } },
    });
    if (clash) {
      return { success: false, error: "Another staff account already uses that email." };
    }

    await db.adminUser.update({
      where: { id: user.id },
      data: { name: parsed.data.name, email: parsed.data.email, roleId: role.id },
    });

    await logActivity({
      actor: ctx,
      action: "STAFF_UPDATED",
      entityType: "STAFF",
      entityId: user.id,
      description: `Updated ${parsed.data.email}`,
      metadata: {
        ...(user.email !== parsed.data.email
          ? { emailFrom: user.email, emailTo: parsed.data.email }
          : {}),
        ...(user.role?.key !== role.key
          ? { roleFrom: user.role?.key ?? null, roleTo: role.key }
          : {}),
      },
    });

    revalidateStaff();
    return { success: true };
  } catch (error) {
    return handle(error, "Couldn't update the staff account.");
  }
}

export async function setStaffActiveAction(
  id: string,
  isActive: boolean,
): Promise<Result> {
  try {
    const ctx = await requirePermission("STAFF_DISABLE");

    const user = await db.adminUser.findUnique({ where: { id }, include: { role: true } });
    if (!user) return { success: false, error: "That staff account no longer exists." };

    if (!isActive) {
      if (user.id === ctx.id) {
        return { success: false, error: "You can't deactivate your own account." };
      }
      await assertNotLastOwner(user.id, "disable");
    }

    await db.adminUser.update({ where: { id }, data: { isActive } });

    await logActivity({
      actor: ctx,
      action: isActive ? "STAFF_ENABLED" : "STAFF_DISABLED",
      entityType: "STAFF",
      entityId: id,
      description: `${isActive ? "Activated" : "Deactivated"} ${user.email}`,
      metadata: { email: user.email },
    });

    revalidateStaff();
    return { success: true };
  } catch (error) {
    return handle(error, "Couldn't change the account status.");
  }
}

export async function resetStaffPasswordAction(
  id: string,
  newPassword: string,
): Promise<Result> {
  try {
    const ctx = await requirePermission("STAFF_EDIT");

    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await db.adminUser.findUnique({ where: { id } });
    if (!user) return { success: false, error: "That staff account no longer exists." };

    await db.adminUser.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(parsed.data, 10) },
    });

    await logActivity({
      actor: ctx,
      action: "STAFF_PASSWORD_RESET",
      entityType: "STAFF",
      entityId: id,
      description: `Reset the password for ${user.email}`,
      metadata: { email: user.email },
    });

    revalidateStaff();
    return { success: true };
  } catch (error) {
    return handle(error, "Couldn't reset the password.");
  }
}

export async function deleteStaffAction(id: string): Promise<Result> {
  try {
    const ctx = await requirePermission("STAFF_DELETE");

    const user = await db.adminUser.findUnique({ where: { id }, include: { role: true } });
    if (!user) return { success: false, error: "That staff account no longer exists." };

    if (user.id === ctx.id) {
      return { success: false, error: "You can't delete your own account." };
    }
    await assertNotLastOwner(user.id, "remove");

    // The account goes; its trail stays. ActivityLog.actorId is SetNull and
    // the actor's name and email are denormalised onto each row.
    await db.adminUser.delete({ where: { id } });

    await logActivity({
      actor: ctx,
      action: "STAFF_DELETED",
      entityType: "STAFF",
      entityId: id,
      description: `Deleted ${user.email}`,
      metadata: { email: user.email, role: user.role?.key ?? null },
    });

    revalidateStaff();
    return { success: true };
  } catch (error) {
    return handle(error, "Couldn't delete the staff account.");
  }
}

// Authorization failures surface verbatim; everything else is logged and
// replaced with a generic message so database detail never reaches the UI.
function handle(error: unknown, fallback: string): Result {
  const denied = authErrorResult(error);
  if (denied) return denied;
  if (error instanceof Error && error.message.startsWith("This is the only active owner")) {
    return { success: false, error: error.message };
  }
  console.error("Staff action error:", error);
  return { success: false, error: fallback };
}
