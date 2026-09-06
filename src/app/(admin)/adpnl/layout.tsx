import { getAdminContext } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

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

  return (
    <AdminShell
      adminName={ctx.name}
      adminEmail={ctx.email}
      roleName={ctx.roleName}
      permissions={ctx.permissions}
    >
      {children}
    </AdminShell>
  );
}
