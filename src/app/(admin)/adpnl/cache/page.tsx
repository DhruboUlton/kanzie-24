import CacheStatusClient from "@/components/admin/CacheStatusClient";
import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function CacheStatusPage() {
  const { allowed, ctx } = await requirePageAccess("SETTINGS_VIEW");
  if (!allowed) return <NoAccess what="the cache status" />;

  return (
    <CacheStatusClient
      canRefresh={Boolean(ctx?.permissions.includes("SETTINGS_MANAGE"))}
    />
  );
}
