import { getSession } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // If not logged in, render unauthenticated child (e.g. login page)
  if (!session) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <AdminShell adminName={session.name} adminEmail={session.email}>
      {children}
    </AdminShell>
  );
}
