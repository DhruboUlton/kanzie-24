"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, ShieldCheck } from "lucide-react";

export default function AdminHeader({ adminName }: { adminName?: string }) {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/products/new")) return "Add New Product";
    if (pathname.includes("/edit")) return "Edit Product";
    if (pathname.startsWith("/admin/products")) return "Products Catalog";
    if (pathname.startsWith("/admin/orders/")) return "Order Details";
    if (pathname.startsWith("/admin/orders")) return "Orders Management";
    if (pathname.startsWith("/admin/categories")) return "Categories";
    if (pathname.startsWith("/admin/settings")) return "Store Settings";
    return "Admin";
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{getTitle()}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SSL Secured</span>
        </div>

        <div className="h-4 w-px bg-gray-200" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs uppercase">
            {(adminName || "A").slice(0, 2)}
          </div>
          <span className="text-xs font-semibold text-gray-700">
            {adminName || "Admin"}
          </span>
        </div>
      </div>
    </header>
  );
}
