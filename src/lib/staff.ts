import "server-only";
import { db } from "@/lib/db";
import {
  OWNER_ROLE_KEY,
  Permission,
  SYSTEM_ROLES,
  sanitizePermissions,
} from "@/lib/permissions";

// Reads for the staff and roles screens. Password hashes are never selected
// here, so they cannot reach a component by accident.

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleKey: string | null;
  roleName: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
};

export async function getStaff(): Promise<StaffRow[]> {
  const users = await db.adminUser.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      role: { select: { id: true, key: true, name: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.role?.id ?? null,
    roleKey: u.role?.key ?? null,
    roleName: u.role?.name ?? null,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  }));
}

export async function getRoles(): Promise<RoleRow[]> {
  const roles = await db.role.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return roles.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissions: sanitizePermissions(r.permissions),
    userCount: r._count.users,
  }));
}

/**
 * Creates any system role that doesn't exist yet. Never overwrites one that
 * does — an owner may have edited a non-OWNER role's permissions, and that
 * edit must survive a deploy.
 */
export async function ensureSystemRoles(): Promise<void> {
  for (const role of SYSTEM_ROLES) {
    const existing = await db.role.findUnique({ where: { key: role.key } });
    if (existing) continue;
    await db.role.create({
      data: {
        key: role.key,
        name: role.name,
        description: role.description,
        isSystem: true,
        permissions: role.permissions as never,
      },
    });
  }
}

/** How many enabled owners exist, optionally ignoring one user. */
export async function countActiveOwners(excludeUserId?: string): Promise<number> {
  return db.adminUser.count({
    where: {
      isActive: true,
      role: { key: OWNER_ROLE_KEY },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

/**
 * Guards every action that could leave the store with no way back in:
 * deleting, disabling, or moving the last active owner off the OWNER role.
 * Server-side only — the UI disables these buttons too, but that is a
 * courtesy, not the control.
 */
export async function assertNotLastOwner(
  userId: string,
  what: "remove" | "disable" | "change the role of",
): Promise<void> {
  const user = await db.adminUser.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) return;
  if (user.role?.key !== OWNER_ROLE_KEY || !user.isActive) return;

  const others = await countActiveOwners(userId);
  if (others === 0) {
    throw new Error(
      `This is the only active owner. Give another staff member the Owner role before you ${what} this account.`,
    );
  }
}

export async function isBootstrapNeeded(): Promise<boolean> {
  try {
    return (await db.adminUser.count()) === 0;
  } catch {
    return false;
  }
}
