import PopupManagerClient from "@/components/admin/PopupManagerClient";
import { getPopupConfig } from "@/lib/popup";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function PopupPage() {
  const { ctx, allowed } = await requirePageAccess("POPUP_VIEW");
  if (!allowed) return <NoAccess what="the pop up settings" />;

  const config = await getPopupConfig();
  // Viewing and editing are separate permissions, so someone holding only
  // POPUP_VIEW gets the settings read-only rather than a Save button that
  // the server will always refuse.
  return (
    <PopupManagerClient
      initial={config}
      canManage={ctx.permissions.includes("POPUP_MANAGE")}
    />
  );
}
