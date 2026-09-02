import IntegrationsClient from "@/components/admin/IntegrationsClient";
import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { getIntegrations } from "@/lib/integrations";
import { ROLE_ADMIN_DENIED, isRoleAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const { ctx, allowed } = await requirePageAccess("INTEGRATIONS_VIEW");
  if (!allowed) return <NoAccess what="integrations" />;

  // Saving a snippet puts arbitrary script on every storefront page, so
  // editing needs the permission and an owner/manager role — see
  // saveIntegrationsAction, which is the check that actually counts.
  const hasPermission = ctx.permissions.includes("INTEGRATIONS_MANAGE");
  const canManage = hasPermission && isRoleAdmin(ctx);

  const lockedReason = canManage
    ? null
    : hasPermission
      ? ROLE_ADMIN_DENIED
      : "You can view the tracking code here but not change it. Ask an owner for the integrations permission.";

  return (
    <IntegrationsClient
      initial={await getIntegrations()}
      canManage={canManage}
      lockedReason={lockedReason}
    />
  );
}
