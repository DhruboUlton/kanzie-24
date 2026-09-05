"use client";

import { usePathname } from "next/navigation";
import { Menu, ShieldCheck } from "lucide-react";

export default function AdminHeader({
  adminName,
  onMenuClick,
}: {
  adminName?: string;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/products/new")) return "Add New Product";
    if (pathname.includes("/edit")) return "Edit Product";
    if (pathname.startsWith("/admin/products")) return "Products Catalog";
    if (pathname.startsWith("/admin/orders/")) return "Order Details";
    if (pathname.startsWith("/admin/orders")) return "Orders Management";
    if (pathname.startsWith("/admin/coupons/usage")) return "Coupon Usage History";
    if (pathname.startsWith("/admin/coupons/")) return "Coupon Details";
    if (pathname.startsWith("/admin/coupons")) return "Coupons & Discounts";
    if (pathname.startsWith("/admin/analytics")) return "Analytics";
    if (pathname.startsWith("/admin/inventory")) return "Inventory";
    if (pathname.startsWith("/admin/staff")) return "Staff";
    if (pathname.startsWith("/admin/roles")) return "Roles & Permissions";
    if (pathname.startsWith("/admin/activity-log")) return "Activity Log";
    if (pathname.startsWith("/admin/categories")) return "Categories";
    if (pathname.startsWith("/admin/banner")) return "Homepage Banner";
    if (pathname.startsWith("/admin/fraud-check")) return "Fraud Checking";
    if (pathname.startsWith("/admin/integrations")) return "Integrations";
    if (pathname.startsWith("/admin/settings")) return "Store Settings";
    return "Admin";
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          className="lg:hidden w-10 h-10 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors shrink-0 flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm sm:text-lg md:text-xl font-bold text-gray-900 truncate">
          {getTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SSL Secured</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-gray-200" />

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {(adminName || "A").slice(0, 2)}
          </div>
          <span className="hidden md:inline text-xs font-semibold text-gray-700 truncate max-w-[10rem]">
            {adminName || "Admin"}
          </span>
        </div>
      </div>
    </header>
  );
}
