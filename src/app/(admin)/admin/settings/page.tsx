import { getSettingsMap } from "@/lib/actions/settings";
import SettingsClient from "@/components/admin/SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettingsMap();
  return <SettingsClient initialSettings={settings} />;
}
