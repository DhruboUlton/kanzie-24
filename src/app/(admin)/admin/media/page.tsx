import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";
import MediaPageClient from "./MediaPageClient";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const { allowed } = await requirePageAccess("MEDIA_VIEW");
  if (!allowed) {
    return <NoAccess what="viewing the media library" />;
  }

  return <MediaPageClient />;
}
