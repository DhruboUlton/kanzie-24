import { getSession } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

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
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-gray-900">
      <AdminSidebar adminName={session.name} adminEmail={session.email} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader adminName={session.name} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
