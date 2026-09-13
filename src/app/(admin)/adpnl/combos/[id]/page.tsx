import { notFound } from "next/navigation";
import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { getComboById, getEligibleProductCandidates } from "@/lib/combos";
import ComboFormClient from "@/components/admin/combos/ComboFormClient";

export const dynamic = "force-dynamic";

export default async function AdminEditComboPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { allowed } = await requirePageAccess("COMBOS_MANAGE");
  if (!allowed) return <NoAccess what="combos" />;

  const { id } = await props.params;
  const [combo, products] = await Promise.all([
    getComboById(id),
    getEligibleProductCandidates(),
  ]);

  if (!combo) notFound();

  return <ComboFormClient initialData={combo} products={products} />;
}
