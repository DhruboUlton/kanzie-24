import { getSettingsMap } from "@/lib/actions/settings";
import SettingsClient from "@/components/admin/SettingsClient";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { allowed } = await requirePageAccess("SETTINGS_VIEW");
  if (!allowed) return <NoAccess what="store settings" />;

  const settings = await getSettingsMap();
  return <SettingsClient initialSettings={settings} />;
}
