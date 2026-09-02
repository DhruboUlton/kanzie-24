// Permission catalogue. No database import — client components read these
// labels and the sidebar filters on them, so this file must stay safe to
// bundle for the browser.
//
// Permissions are code-level constants because every check is a literal in
// a server action (`requirePermission("ORDERS_CANCEL")`). Roles are rows in
// the database and hold their permission keys as a JSON array, validated
// against this catalogue on write. That keeps the catalogue type-safe and
// avoids a Permission table whose rows would only ever mirror this list.

export const PERMISSIONS = {
  PRODUCTS_VIEW: "See the product catalogue",
  PRODUCTS_CREATE: "Add new products",
  PRODUCTS_EDIT: "Edit existing products",
  PRODUCTS_ARCHIVE: "Archive and restore products",

  ORDERS_VIEW: "See orders and customer contact details",
  ORDERS_EDIT: "Add notes and tracking numbers to orders",
  ORDERS_STATUS_CHANGE: "Move orders through the pipeline",
  ORDERS_CANCEL: "Cancel orders",

  INVENTORY_VIEW: "See stock levels and movement history",
  INVENTORY_ADJUST: "Change stock counts and cost prices",

  CATEGORIES_VIEW: "See categories",
  CATEGORIES_MANAGE: "Create, rename and delete categories",

  BANNER_VIEW: "See the homepage banner editors",
  BANNER_MANAGE: "Change the homepage banners",

  FRAUD_CHECK_VIEW: "Run courier fraud checks",

  FINANCE_VIEW: "See revenue and stock valuation figures",

  ANALYTICS_VIEW: "Open the analytics dashboard",

  SETTINGS_VIEW: "See store settings",
  SETTINGS_MANAGE: "Change store settings and courier logins",

  STAFF_VIEW: "See the staff list",
  STAFF_CREATE: "Add staff accounts",
  STAFF_EDIT: "Edit staff and reset their passwords",
  STAFF_DISABLE: "Activate and deactivate staff",
  STAFF_DELETE: "Delete staff accounts",

  ROLES_VIEW: "See roles and what they grant",
  ROLES_MANAGE: "Create roles and change their permissions",

  ACTIVITY_LOG_VIEW: "See the admin activity log",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && value in PERMISSIONS;
}

// Drops anything that isn't a current permission key, so a role saved
// before a permission was renamed can't grant a phantom one.
export function sanitizePermissions(values: unknown): Permission[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter(isPermission)));
}

// Grouping is presentation only — it drives the role editor's layout.
export const PERMISSION_GROUPS: { label: string; keys: Permission[] }[] = [
  { label: "Products", keys: ["PRODUCTS_VIEW", "PRODUCTS_CREATE", "PRODUCTS_EDIT", "PRODUCTS_ARCHIVE"] },
  { label: "Orders", keys: ["ORDERS_VIEW", "ORDERS_EDIT", "ORDERS_STATUS_CHANGE", "ORDERS_CANCEL"] },
  { label: "Inventory", keys: ["INVENTORY_VIEW", "INVENTORY_ADJUST"] },
  { label: "Categories", keys: ["CATEGORIES_VIEW", "CATEGORIES_MANAGE"] },
  { label: "Banner", keys: ["BANNER_VIEW", "BANNER_MANAGE"] },
  { label: "Fraud check", keys: ["FRAUD_CHECK_VIEW"] },
  { label: "Money", keys: ["FINANCE_VIEW"] },
  { label: "Analytics", keys: ["ANALYTICS_VIEW"] },
  { label: "Settings", keys: ["SETTINGS_VIEW", "SETTINGS_MANAGE"] },
  { label: "Staff", keys: ["STAFF_VIEW", "STAFF_CREATE", "STAFF_EDIT", "STAFF_DISABLE", "STAFF_DELETE"] },
  { label: "Roles", keys: ["ROLES_VIEW", "ROLES_MANAGE"] },
  { label: "Activity log", keys: ["ACTIVITY_LOG_VIEW"] },
];

// The role every system starts with. OWNER is special in code as well as
// in data: it always holds every permission, including ones added later.
export const OWNER_ROLE_KEY = "OWNER";

export const SYSTEM_ROLES: {
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
}[] = [
  {
    key: OWNER_ROLE_KEY,
    name: "Owner",
    description: "Full access, including staff and permissions.",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "ORDER_MANAGER",
    name: "Order Manager",
    description:
      "Handles the order pipeline and fraud checks. Reads the catalogue and stock but changes neither.",
    permissions: [
      "ORDERS_VIEW",
      "ORDERS_EDIT",
      "ORDERS_STATUS_CHANGE",
      "ORDERS_CANCEL",
      "FRAUD_CHECK_VIEW",
      "PRODUCTS_VIEW",
      "INVENTORY_VIEW",
    ],
  },
  {
    key: "INVENTORY_MANAGER",
    name: "Inventory Manager",
    description:
      "Owns the catalogue and stock. Cannot touch orders, staff or store settings.",
    permissions: [
      "PRODUCTS_VIEW",
      "PRODUCTS_CREATE",
      "PRODUCTS_EDIT",
      "PRODUCTS_ARCHIVE",
      "INVENTORY_VIEW",
      "INVENTORY_ADJUST",
      "CATEGORIES_VIEW",
      "CATEGORIES_MANAGE",
    ],
  },
  {
    key: "MARKETING_MANAGER",
    name: "Marketing Manager",
    description:
      "Runs the storefront's promotional surfaces. Can edit product copy but not create or archive products.",
    permissions: [
      "BANNER_VIEW",
      "BANNER_MANAGE",
      "PRODUCTS_VIEW",
      "PRODUCTS_EDIT",
      "CATEGORIES_VIEW",
      "CATEGORIES_MANAGE",
    ],
  },
];

// What the signed-in admin's identity looks like everywhere in the app.
// Permissions are resolved per request from the database rather than being
// carried in the session cookie, so a role change takes effect immediately
// instead of waiting for the token to expire.
export type AdminContext = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  roleKey: string | null;
  roleName: string | null;
  permissions: Permission[];
};

export function hasPermission(
  ctx: Pick<AdminContext, "permissions"> | null,
  permission: Permission,
): boolean {
  return !!ctx?.permissions.includes(permission);
}

export function hasAnyPermission(
  ctx: Pick<AdminContext, "permissions"> | null,
  permissions: Permission[],
): boolean {
  return !!ctx && permissions.some((p) => ctx.permissions.includes(p));
}
