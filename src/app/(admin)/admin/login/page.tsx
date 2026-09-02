import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import SetupOwnerForm from "@/components/admin/SetupOwnerForm";
import { isBootstrapNeeded } from "@/lib/staff";
import { getAdminContext } from "@/lib/auth";
import { safeAdminDestination } from "@/lib/admin-redirect";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // With no admin accounts at all there is nothing to sign in as, so offer
  // setup instead. There is no fallback credential to fall back to.
  const needsSetup = await isBootstrapNeeded();

  if (!needsSetup) {
    // The one and only "already signed in?" check on this page — the same
    // database-backed one every protected admin page uses. Anything weaker
    // (like checking just the cookie's JWT signature) can disagree with
    // those pages and loop forever bouncing between here and there.
    const ctx = await getAdminContext();
    if (ctx) {
      const sp = await props.searchParams;
      const from = typeof sp.from === "string" ? sp.from : undefined;
      redirect(safeAdminDestination(from));
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0c0c] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 text-white">
      {needsSetup ? <SetupOwnerForm /> : <LoginForm />}
    </div>
  );
}
