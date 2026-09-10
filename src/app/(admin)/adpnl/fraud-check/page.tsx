import FraudCheckClient from "@/components/admin/FraudCheckClient";
import { getCourierCredentialsStatusAction } from "@/lib/actions/courier-credentials";
import { requirePageAdmin } from "@/lib/admin-guard";
import { isOwner } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Open to every signed-in admin. Checking whether a phone number has a
// history of refused deliveries is something anyone confirming a COD order
// may need, it changes nothing, and it reveals no courier logins — so it is
// not worth a permission of its own. The sensitive half of this page is the
// merchant credentials, and those are owner-only below.
export default async function FraudCheckPage() {
  const ctx = await requirePageAdmin();

  // Only the owner pays for reading the credential status. This used to be
  // fetched for everyone, and the action behind it throws when the caller
  // lacks the capability — with no error boundary above this page, that
  // turned a permitted visit into a 500 for every non-owner role.
  const canManageCredentials = isOwner(ctx);
  const initialCredentialsStatus = canManageCredentials
    ? await getCourierCredentialsStatusAction()
    : null;

  return (
    <FraudCheckClient
      initialCredentialsStatus={initialCredentialsStatus}
      canManageCredentials={canManageCredentials}
    />
  );
}
