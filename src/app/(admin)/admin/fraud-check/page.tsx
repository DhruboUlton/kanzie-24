import FraudCheckClient from "@/components/admin/FraudCheckClient";
import { getCourierCredentialsStatusAction } from "@/lib/actions/courier-credentials";

export const dynamic = "force-dynamic";

export default async function FraudCheckPage() {
  const initialCredentialsStatus = await getCourierCredentialsStatusAction();
  return <FraudCheckClient initialCredentialsStatus={initialCredentialsStatus} />;
}
