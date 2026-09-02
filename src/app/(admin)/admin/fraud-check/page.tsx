import FraudCheckClient from "@/components/admin/FraudCheckClient";
import { getCourierCredentialsStatusAction } from "@/lib/actions/courier-credentials";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function FraudCheckPage() {
  const { allowed } = await requirePageAccess("FRAUD_CHECK_VIEW");
  if (!allowed) return <NoAccess what="fraud checks" />;

  const initialCredentialsStatus = await getCourierCredentialsStatusAction();
  return <FraudCheckClient initialCredentialsStatus={initialCredentialsStatus} />;
}
