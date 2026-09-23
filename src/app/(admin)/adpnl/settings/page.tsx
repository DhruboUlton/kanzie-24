import { getSettingsMap } from "@/lib/actions/settings";
import { getTelegramStatusAction } from "@/lib/actions/telegram";
import SettingsClient from "@/components/admin/SettingsClient";
import { requirePageAccess } from "@/lib/admin-guard";
import { isOwner } from "@/lib/permissions";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { allowed, ctx } = await requirePageAccess("SETTINGS_VIEW");
  if (!allowed) return <NoAccess what="store settings" />;

  const settings = await getSettingsMap();

  // Only the owner may see or change where order notifications go, and the
  // action behind it throws for anyone else — so it is not called for them.
  const canManageTelegram = Boolean(ctx && isOwner(ctx));
  const telegram = canManageTelegram ? await getTelegramStatusAction() : null;

  return (
    <SettingsClient
      initialSettings={settings}
      telegram={telegram}
      canManageTelegram={canManageTelegram}
    />
  );
}
