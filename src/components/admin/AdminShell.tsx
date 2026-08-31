"use client";

import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

// Holds the sidebar drawer state so the header's menu button and the
// sidebar itself can share it. Below lg the sidebar is off-canvas; from lg
// up it's a normal static column and the drawer state is irrelevant.
export default function AdminShell({
  adminName,
  adminEmail,
  children,
}: {
  adminName?: string;
  adminEmail?: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-gray-900">
      <div
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
        className={`lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <AdminSidebar
        adminName={adminName}
        adminEmail={adminEmail}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader
          adminName={adminName}
          onMenuClick={() => setSidebarOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
