"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { signSessionToken, requireAdmin, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { ensureSystemRoles, isBootstrapNeeded } from "@/lib/staff";
import { OWNER_ROLE_KEY } from "@/lib/permissions";

import { STAFF_MARKER_COOKIE } from "@/lib/integrations-shared";

const COOKIE_NAME = "kanzie_admin_session";
const SESSION_DAYS = 7;

// One message for every failure mode. Saying "no such account" would let
// anyone enumerate staff emails, and "account disabled" confirms a valid
// login to someone who shouldn't have it.
const SIGN_IN_FAILED = "Invalid email or password.";

async function setSessionCookie(user: { id: string; email: string; name: string }) {
  const token = await signSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });

  // Deliberately readable by scripts, unlike the session above: the
  // storefront's tracking injector checks it in the browser so staff
  // browsing the shop aren't counted as customers. It carries no secret and
  // grants nothing — a visitor who sets it by hand only opts themselves out
  // of analytics.
  cookieStore.set(STAFF_MARKER_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function loginAdminAction(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { success: false, error: SIGN_IN_FAILED };
  }

  try {
    const admin = await db.adminUser.findUnique({
      where: { email: normalizedEmail },
      include: { role: true },
    });

    // No hardcoded fallback account: authentication is only ever a bcrypt
    // comparison against a stored hash. Compare against a dummy hash when
    // the account is missing so a wrong email and a wrong password take
    // the same time to answer.
    const hash =
      admin?.passwordHash ??
      "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
    const passwordMatches = await bcrypt.compare(password, hash);

    if (!admin || !passwordMatches) {
      return { success: false, error: SIGN_IN_FAILED };
    }
    if (!admin.isActive) {
      return { success: false, error: SIGN_IN_FAILED };
    }
    if (!admin.roleId) {
      return {
        success: false,
        error: "This account has no role assigned. Ask an owner to set one.",
      };
    }

    await setSessionCookie(admin);
    await db.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error("Admin login error:", error);
    return { success: false, error: "Couldn't sign in right now. Please try again." };
  }
}

export async function logoutAdminAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(STAFF_MARKER_COOKIE);
}

const bootstrapSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters."),
});

/**
 * First-run setup: creates the system roles and the first owner, but only
 * while the store has no admin accounts at all. That condition is re-checked
 * inside the transaction, so this cannot be used to add a second account —
 * it is a one-time door, not a fallback credential.
 */
export async function bootstrapOwnerAction(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = bootstrapSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    if (!(await isBootstrapNeeded())) {
      return {
        success: false,
        error: "Setup has already been completed. Sign in instead.",
      };
    }

    await ensureSystemRoles();
    const ownerRole = await db.role.findUnique({ where: { key: OWNER_ROLE_KEY } });
    if (!ownerRole) {
      return { success: false, error: "Couldn't create the owner role. Please try again." };
    }

    const created = await db.$transaction(async (tx) => {
      // Re-check under the transaction: two people opening the setup page
      // at once must not both get an owner account.
      if ((await tx.adminUser.count()) > 0) return null;
      return tx.adminUser.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash: await bcrypt.hash(parsed.data.password, 10),
          roleId: ownerRole.id,
          isActive: true,
        },
      });
    });

    if (!created) {
      return { success: false, error: "Setup has already been completed. Sign in instead." };
    }

    await setSessionCookie(created);
    await logActivity({
      actor: { id: created.id, email: created.email, name: created.name },
      action: "OWNER_BOOTSTRAPPED",
      entityType: "STAFF",
      entityId: created.id,
      description: "First owner account created during setup",
    });

    return { success: true };
  } catch (error) {
    console.error("Bootstrap error:", error);
    return { success: false, error: "Couldn't complete setup. Please try again." };
  }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(10, "Use at least 10 characters."),
});

/** Any signed-in staff member can change their own password. */
export async function changeOwnPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await requireAdmin();

    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await db.adminUser.findUnique({ where: { id: ctx.id } });
    if (!user) return { success: false, error: "Account not found." };

    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) return { success: false, error: "Your current password is incorrect." };

    await db.adminUser.update({
      where: { id: ctx.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
    });

    await logActivity({
      actor: ctx,
      action: "PASSWORD_CHANGED",
      entityType: "STAFF",
      entityId: ctx.id,
      description: "Changed their own password",
    });

    return { success: true };
  } catch (error) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    console.error("Change password error:", error);
    return { success: false, error: "Couldn't change the password. Please try again." };
  }
}
