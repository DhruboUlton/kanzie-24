"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FolderTree,
  Settings,
  ExternalLink,
  LogOut,
  Truck,
  Layers,
  ShieldAlert,
  Images,
  Boxes,
} from "lucide-react";
import { logoutAdminAction } from "@/lib/actions/auth";

export default function AdminSidebar({
  adminName,
  adminEmail,
  open = false,
  onNavigate,
}: {
  adminName?: string;
  adminEmail?: string;
  open?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    { href: "/admin/categories", label: "Categories", icon: FolderTree },
    { href: "/admin/banner", label: "Banner", icon: Images },
    { href: "/admin/fraud-check", label: "Fraud Check", icon: ShieldAlert },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className={`w-64 bg-[#121212] border-r border-white/10 flex flex-col justify-between shrink-0 text-white select-none overflow-y-auto fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#c0282b] flex items-center justify-center font-bold text-white tracking-wider text-sm shadow-md shadow-[#c0282b]/30">
              KZ
            </div>
            <div>
              <span className="font-extrabold tracking-wider text-base text-white">
                KANZIE
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#c0282b] block -mt-1">
                Admin Center
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Store Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#c0282b] text-white shadow-sm font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Account / Live Store */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-accent" />
            <span>Open Storefront</span>
          </span>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/70">
            Live
          </span>
        </Link>

        {/* Admin profile & Logout */}
        <div className="px-3 py-2.5 bg-white/5 rounded-lg flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-white truncate">
              {adminName || "Administrator"}
            </p>
            <p className="text-[11px] text-white/40 truncate">
              {adminEmail || "admin@kanzie.com"}
            </p>
          </div>
          <form
            action={async () => {
              await logoutAdminAction();
              window.location.href = "/admin/login";
            }}
          >
            <button
              type="submit"
              title="Sign Out"
              className="p-1.5 text-white/50 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
