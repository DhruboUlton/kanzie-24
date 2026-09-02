import RolesClient from "@/components/admin/RolesClient";
import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { ensureSystemRoles, getRoles } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const { ctx, allowed } = await requirePageAccess("ROLES_VIEW");
  if (!allowed) return <NoAccess what="roles and permissions" />;

  // Creates any built-in role that doesn't exist yet; never overwrites one
  // whose permissions an owner has since edited.
  await ensureSystemRoles();
  const roles = await getRoles();

  return (
    <RolesClient roles={roles} permissions={ctx.permissions} roleKey={ctx.roleKey} />
  );
}
