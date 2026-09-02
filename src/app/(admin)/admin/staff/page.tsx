import StaffClient from "@/components/admin/StaffClient";
import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { getRoles, getStaff } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { ctx, allowed } = await requirePageAccess("STAFF_VIEW");
  if (!allowed) return <NoAccess what="staff management" />;

  const [staff, roles] = await Promise.all([getStaff(), getRoles()]);

  return (
    <StaffClient
      staff={staff}
      roles={roles}
      currentUserId={ctx.id}
      permissions={ctx.permissions}
    />
  );
}
