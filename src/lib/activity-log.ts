import "server-only";
import { db } from "@/lib/db";
import { AdminContext } from "@/lib/permissions";

// Append-only trail of administrative actions. Nothing in the application
// updates or deletes a row here; the only write path is logActivity().

export type ActivityAction =
  | "STAFF_CREATED"
  | "STAFF_UPDATED"
  | "STAFF_ENABLED"
  | "STAFF_DISABLED"
  | "STAFF_DELETED"
  | "STAFF_PASSWORD_RESET"
  | "PASSWORD_CHANGED"
  | "ROLE_CREATED"
  | "ROLE_UPDATED"
  | "ROLE_DELETED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_ARCHIVED"
  | "PRODUCT_RESTORED"
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  | "INVENTORY_ADJUSTED"
  | "INVENTORY_RECEIVED"
  | "INVENTORY_SETTINGS_UPDATED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_NOTE_ADDED"
  | "SETTINGS_UPDATED"
  | "COURIER_CREDENTIALS_UPDATED"
  | "BANNER_UPDATED"
  | "INTEGRATIONS_UPDATED"
  | "OWNER_BOOTSTRAPPED";

export type ActivityEntity =
  | "STAFF"
  | "ROLE"
  | "PRODUCT"
  | "CATEGORY"
  | "ORDER"
  | "INVENTORY"
  | "SETTINGS"
  | "BANNER"
  | "INTEGRATIONS";

export type ActivityLogRow = {
  id: string;
  actorEmail: string;
  actorName: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

/**
 * Records an action. Deliberately swallows its own failures: an audit write
 * that throws must not roll back or block the operation it is describing.
 */
export async function logActivity(input: {
  actor: Pick<AdminContext, "id" | "email" | "name">;
  action: ActivityAction;
  entityType?: ActivityEntity;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        actorId: input.actor.id,
        actorEmail: input.actor.email,
        actorName: input.actor.name,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        description: input.description ?? null,
        metadata: (input.metadata ?? undefined) as never,
      },
    });
  } catch (error) {
    console.warn("Activity log write failed:", error);
  }
}

export async function getActivityLog(options?: {
  limit?: number;
  action?: string;
  entityType?: string;
  actorId?: string;
}): Promise<ActivityLogRow[]> {
  const rows = await db.activityLog.findMany({
    where: {
      action: options?.action || undefined,
      entityType: options?.entityType || undefined,
      actorId: options?.actorId || undefined,
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(options?.limit ?? 200, 500),
  });

  return rows.map((r) => ({
    id: r.id,
    actorEmail: r.actorEmail,
    actorName: r.actorName,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    description: r.description,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt,
  }));
}

export async function getActivityActors(): Promise<
  { id: string; name: string; email: string }[]
> {
  const users = await db.adminUser.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return users;
}
