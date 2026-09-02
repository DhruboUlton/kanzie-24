import LoginForm from "@/components/admin/LoginForm";
import SetupOwnerForm from "@/components/admin/SetupOwnerForm";
import { isBootstrapNeeded } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // With no admin accounts at all there is nothing to sign in as, so offer
  // setup instead. There is no fallback credential to fall back to.
  const needsSetup = await isBootstrapNeeded();

  return (
    <div className="min-h-screen bg-[#0d0c0c] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 text-white">
      {needsSetup ? <SetupOwnerForm /> : <LoginForm />}
    </div>
  );
}
