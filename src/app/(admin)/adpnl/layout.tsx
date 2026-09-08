import { getAdminContext, getSession } from "@/lib/auth";
import { getSessionIdleMinutes } from "@/lib/session-policy";
import AdminShell from "@/components/admin/AdminShell";
import SessionTimeoutWarning from "@/components/admin/SessionTimeoutWarning";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();

  // No usable context: not signed in, or signed in with a cookie whose
  // account has since been deleted, disabled, or stripped of its role.
  // Render the child bare — that's the login page. Protected pages send
  // their own visitors to /adpnl/login via requirePageAdmin(), which can't
  // be done here because this layout also wraps the login page itself.
  if (!ctx) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  // Only inside this branch, so the countdown never runs on the login page —
  // and not at all on a device the admin asked to be remembered, where there
  // is no idle limit to count down to.
  const [session, idleMinutes] = await Promise.all([
    getSession(),
    getSessionIdleMinutes(),
  ]);

  return (
    <AdminShell
      adminName={ctx.name}
      adminEmail={ctx.email}
      roleName={ctx.roleName}
      permissions={ctx.permissions}
    >
      {!session?.remembered && (
        <SessionTimeoutWarning idleMinutes={idleMinutes} />
      )}
      {children}
    </AdminShell>
  );
}
