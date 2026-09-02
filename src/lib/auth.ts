import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import {
  AdminContext,
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  Permission,
  ROLE_ADMIN_DENIED,
  isRoleAdmin,
  sanitizePermissions,
} from "@/lib/permissions";

const COOKIE_NAME = "kanzie_admin_session";
const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || "kanzie-super-secure-admin-secret-key-32chars!"
);

// The cookie carries identity only. Permissions are read from the database
// on every request instead, so disabling an account or changing its role
// takes effect on the next click rather than whenever the token expires.
export type AdminSession = {
  id: string;
  email: string;
  name: string;
};

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = "Your session has ended. Please sign in again.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export async function signSessionToken(session: AdminSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

// Resolves the signed-in admin against the database: confirms the account
// still exists and is active, and reads its current permissions. Returns
// null for anyone who shouldn't be here, so callers never have to
// distinguish "no cookie" from "account disabled".
export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await getSession();
  if (!session?.id) return null;

  try {
    const user = await db.adminUser.findUnique({
      where: { id: session.id },
      include: { role: true },
    });
    if (!user || !user.isActive) return null;

    // OWNER always holds everything, including permissions added by a later
    // release — otherwise shipping a new permission would silently lock the
    // owner out of the feature it guards.
    const permissions: Permission[] =
      user.role?.key === OWNER_ROLE_KEY
        ? ALL_PERMISSIONS
        : sanitizePermissions(user.role?.permissions);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      roleKey: user.role?.key ?? null,
      roleName: user.role?.name ?? null,
      permissions,
    };
  } catch {
    // Database unreachable: refuse rather than fall back to an unchecked
    // session. Admin work needs the database anyway.
    return null;
  }
}

/**
 * Any signed-in, active admin. Still the right check for actions every
 * staff member may run (reading their own profile, signing out).
 */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) throw new UnauthenticatedError();
  return ctx;
}

/** Gate for one specific capability. */
export async function requirePermission(
  permission: Permission,
): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (!ctx.permissions.includes(permission)) throw new ForbiddenError();
  return ctx;
}

/**
 * Gate for anything that creates, changes or assigns a role. Needs the
 * capability *and* an owner/manager role — see isRoleAdmin(). Both, so that
 * an owner can still decide which manager actually gets the checkbox.
 */
export async function requireRoleAdmin(
  permission: Permission,
): Promise<AdminContext> {
  const ctx = await requirePermission(permission);
  if (!isRoleAdmin(ctx)) throw new ForbiddenError(ROLE_ADMIN_DENIED);
  return ctx;
}

/** Gate where any one of several capabilities is enough. */
export async function requireAnyPermission(
  permissions: Permission[],
): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (!permissions.some((p) => ctx.permissions.includes(p))) {
    throw new ForbiddenError();
  }
  return ctx;
}

/**
 * Turns an authorization failure into a result object for server actions
 * that report errors in the UI rather than throwing to an error boundary.
 * Anything else is re-thrown — a database fault must not be reported to
 * the user as a permission problem.
 */
export function authErrorResult(
  error: unknown,
): { success: false; error: string } | null {
  if (error instanceof ForbiddenError || error instanceof UnauthenticatedError) {
    return { success: false, error: error.message };
  }
  return null;
}
