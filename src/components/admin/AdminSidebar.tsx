"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ScrollText,
  KeyRound,
  ChartColumn,
  Package,
  ShoppingCart,
  FolderTree,
  Settings,
  ExternalLink,
  LogOut,
  ShieldAlert,
  Images,
  Boxes,
  Plug,
  TicketPercent,
  MessageSquareQuote,
  AppWindow,
  X,
} from "lucide-react";
import { logoutAdminAction } from "@/lib/actions/auth";
import { Permission } from "@/lib/permissions";
import ChangePasswordDialog from "@/components/admin/ChangePasswordDialog";

// Each item names the permission that opens it. This is a UX filter only —
// every page and every server action does its own check, so a hidden link
// is a convenience, never the control.
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  permission?: Permission;
};

const STORE_NAV: NavItem[] = [
  { href: "/adpnl", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/adpnl/products", label: "Products", icon: Package, permission: "PRODUCTS_VIEW" },
  { href: "/adpnl/media", label: "Media Library", icon: Images, permission: "MEDIA_VIEW" },
  { href: "/adpnl/orders", label: "Orders", icon: ShoppingCart, permission: "ORDERS_VIEW" },
  { href: "/adpnl/coupons", label: "Coupons", icon: TicketPercent, permission: "COUPONS_VIEW" },
  { href: "/adpnl/analytics", label: "Analytics", icon: ChartColumn, permission: "ANALYTICS_VIEW" },
  { href: "/adpnl/inventory", label: "Inventory", icon: Boxes, permission: "INVENTORY_VIEW" },
  { href: "/adpnl/categories", label: "Categories", icon: FolderTree, permission: "CATEGORIES_VIEW" },
  { href: "/adpnl/banner", label: "Banner", icon: Images, permission: "BANNER_VIEW" },
  { href: "/adpnl/popup", label: "Pop up", icon: AppWindow, permission: "POPUP_VIEW" },
  { href: "/adpnl/reviews", label: "Reviews", icon: MessageSquareQuote, permission: "REVIEWS_VIEW" },
  // No permission: the fraud lookup is open to every signed-in admin.
  { href: "/adpnl/fraud-check", label: "Fraud Check", icon: ShieldAlert },
  { href: "/adpnl/integrations", label: "Integrations", icon: Plug, permission: "INTEGRATIONS_VIEW" },
  { href: "/adpnl/settings", label: "Settings", icon: Settings, permission: "SETTINGS_VIEW" },
];

const STAFF_NAV: NavItem[] = [
  { href: "/adpnl/staff", label: "Staff", icon: Users, permission: "STAFF_VIEW" },
  { href: "/adpnl/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "ROLES_VIEW" },
  { href: "/adpnl/activity-log", label: "Activity Log", icon: ScrollText, permission: "ACTIVITY_LOG_VIEW" },
];

export default function AdminSidebar({
  adminName,
  adminEmail,
  roleName,
  permissions = [],
  open = false,
  onClose,
  onNavigate,
}: {
  adminName?: string;
  adminEmail?: string;
  roleName?: string | null;
  permissions?: Permission[];
  open?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [changingPassword, setChangingPassword] = useState(false);

  const allowed = (items: NavItem[]) =>
    items.filter((i) => !i.permission || permissions.includes(i.permission));

  const navItems = allowed(STORE_NAV);
  const staffItems = allowed(STAFF_NAV);

  return (
    <aside
      className={`w-64 bg-[#121212] border-r border-white/10 flex flex-col justify-between shrink-0 text-white select-none overflow-y-auto fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 sm:px-6 flex items-center justify-between border-b border-white/10">
          <Link href="/adpnl" onClick={onNavigate} className="flex items-center gap-2.5">
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

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation sidebar"
            className="lg:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
                className={`flex items-center gap-3 px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium transition-all ${
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

          {staffItems.length > 0 && (
            <>
              <div className="px-3 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Staff &amp; Permissions
              </div>
              {staffItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium transition-all ${
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
            </>
          )}
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
              {adminEmail}
            </p>
            {roleName && (
              <p className="text-[10px] font-semibold text-[#e0787a] truncate mt-0.5">
                {roleName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setChangingPassword(true)}
            title="Change your password"
            aria-label="Change your password"
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <form
            action={async () => {
              await logoutAdminAction();
              window.location.href = "/adpnl/login";
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
      {changingPassword && (
        <ChangePasswordDialog onClose={() => setChangingPassword(false)} />
      )}
    </aside>
  );
}
