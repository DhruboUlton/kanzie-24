import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { getEligibleProductCandidates } from "@/lib/combos";
import ComboFormClient from "@/components/admin/combos/ComboFormClient";

export const dynamic = "force-dynamic";

export default async function AdminNewComboPage() {
  const { allowed } = await requirePageAccess("COMBOS_MANAGE");
  if (!allowed) return <NoAccess what="combos" />;

  const products = await getEligibleProductCandidates();

  return <ComboFormClient products={products} />;
}
