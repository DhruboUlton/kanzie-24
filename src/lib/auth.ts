import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { getSessionIdleMinutes } from "@/lib/session-policy";
import {
  AdminContext,
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  Permission,
  ROLE_ADMIN_DENIED,
  isRoleAdmin,
  sanitizePermissions,
} from "@/lib/permissions";
import { getSessionSecret } from "@/lib/secret";

const COOKIE_NAME = "kanzie_admin_session";

// Resolved on first use, not at module load: `next build` runs with
// NODE_ENV=production but without the runtime secret, and the fail-hard in
// getSessionSecret() must fire on a real request, not during the build's
// import of this module.
let cachedSecretKey: Uint8Array | null = null;
function secretKey(): Uint8Array {
  if (!cachedSecretKey) {
    cachedSecretKey = new TextEncoder().encode(getSessionSecret());
  }
  return cachedSecretKey;
}

// The cookie carries identity only. Permissions are read from the database
// on every request instead, so disabling an account or changing its role
// takes effect on the next click rather than whenever the token expires.
export type AdminSession = {
  id: string;
  email: string;
  name: string;
  // Token issue time (epoch seconds) from the JWT, used to reject sessions
  // predating a password change. Absent only on a token with no iat.
  iat?: number;
  // The idle window this token was minted under, in minutes. Carried in the
  // token because the middleware slides the session forward on activity and
  // runs on the edge, where the settings row is not readable.
  idle?: number;
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

/**
 * Mints a session token that expires after `idleMinutes` of silence.
 *
 * The window is passed in rather than read here: this module is imported by
 * the edge middleware, which cannot reach the database, and every caller that
 * mints a token is already on a code path that can.
 */
export async function signSessionToken(
  session: AdminSession,
  idleMinutes: number,
): Promise<string> {
  return new SignJWT({ ...session, idle: idleMinutes })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${idleMinutes}m`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
      idle: typeof payload.idle === "number" ? payload.idle : undefined,
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
    // Both reads go out together: the idle window is needed on every admin
    // request, and waiting for it after the user lookup would make this two
    // round trips instead of one.
    const [user, idleMinutes] = await Promise.all([
      db.adminUser.findUnique({
        where: { id: session.id },
        include: { role: true },
      }),
      getSessionIdleMinutes(),
    ]);
    if (!user || !user.isActive) return null;

    // Reject a session issued before the account's last password change. iat
    // is in seconds; allow a 5s skew so a token minted in the same request
    // that set the boundary is not thrown out by rounding.
    if (user.sessionValidFrom && typeof session.iat === "number") {
      if (session.iat * 1000 < user.sessionValidFrom.getTime() - 5000) {
        return null;
      }
    }

    // The token's own expiry enforces the window it was minted under. These
    // two checks enforce the window configured *now*, so shortening the limit
    // reaches sessions that are already open.
    //
    // The claim is checked as well as the age, and it is the one that does the
    // work: the middleware slides `iat` forward on every request, so a session
    // being actively used always looks freshly issued by the time this runs.
    // What it cannot disguise is which policy it was minted under.
    if (typeof session.idle === "number" && session.idle > idleMinutes) {
      return null;
    }
    // Catches the tokens the claim cannot: ones minted before this setting
    // existed, which the middleware also declines to slide.
    if (typeof session.iat === "number") {
      const idleFor = Date.now() - session.iat * 1000;
      if (idleFor > idleMinutes * 60_000) return null;
    }

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
 * Gate strictly for Owner-only operations (e.g. creating/generating coupons).
 * Non-owners are forbidden regardless of any permission flags.
 */
export async function requireOwner(): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (ctx.roleKey !== OWNER_ROLE_KEY) {
    throw new ForbiddenError("Only the store owner can perform this action.");
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
