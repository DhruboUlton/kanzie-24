// Chart-side formatting. Money is stored in cents everywhere; these keep the
// axes and tooltips readable without dragging in another dependency.

export function taka(cents: number): string {
  return `৳${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function takaExact(cents: number): string {
  return `৳${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Axis ticks: ৳12.5k rather than ৳12,500, which never fits. */
export function compactTaka(cents: number): string {
  const v = cents / 100;
  if (Math.abs(v) >= 1_000_000) return `৳${(v / 1_000_000).toFixed(1)}m`;
  if (Math.abs(v) >= 1_000) return `৳${(v / 1_000).toFixed(1)}k`;
  return `৳${Math.round(v)}`;
}

export const CHART_COLORS = {
  revenue: "#c0282b",
  revenuePrev: "#f0a0a2",
  orders: "#282828",
  ordersPrev: "#a8a8a8",
  profit: "#10b981",
  units: "#3b82f6",
  grid: "#f0f0f0",
  axis: "#9ca3af",
};

export const CATEGORY_COLORS = [
  "#c0282b",
  "#282828",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];
