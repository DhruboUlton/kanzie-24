import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { getComboList } from "@/lib/combos";
import ComboDashboardClient from "@/components/admin/combos/ComboDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminCombosPage(props: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { ctx, allowed } = await requirePageAccess("COMBOS_VIEW");
  if (!allowed) return <NoAccess what="combos" />;

  const { q, status } = await props.searchParams;

  const list = await getComboList({
    search: q,
    status,
    limit: 100,
  });

  return (
    <ComboDashboardClient
      combos={list.combos}
      total={list.total}
      filters={{ q: q ?? "", status: status ?? "all" }}
      canManage={ctx.permissions.includes("COMBOS_MANAGE")}
    />
  );
}
