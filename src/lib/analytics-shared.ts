import { storeDate, storeParts } from "@/lib/datetime";

// Date-range vocabulary and result shapes. No database import — the range
// picker and the charts are client components and need these too.

export const RANGE_PRESETS = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "last90",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "custom",
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  last90: "Last 90 days",
  thisMonth: "This month",
  lastMonth: "Last month",
  thisYear: "This year",
  custom: "Custom range",
};

export function isRangePreset(value: unknown): value is RangePreset {
  return typeof value === "string" && (RANGE_PRESETS as readonly string[]).includes(value);
}

export type DateRange = { from: Date; to: Date };

// All range maths happens in store time. The server runs UTC, so without
// this "Today" would mean the UTC day — wrong for six hours out of every
// twenty-four in Bangladesh.
function dayStart(d: Date): Date {
  const { year, month, day } = storeParts(d);
  return storeDate(year, month, day, 0, 0, 0, 0);
}

function dayEnd(d: Date): Date {
  const { year, month, day } = storeParts(d);
  return storeDate(year, month, day, 23, 59, 59, 999);
}

function shiftDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

// Day buckets stay readable up to about a quarter; beyond that a chart with
// one point per day is unreadable, so switch to months.
export type Granularity = "day" | "month";

export function granularityFor(range: DateRange): Granularity {
  const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
  return days > 92 ? "month" : "day";
}

/**
 * Resolves a preset into concrete bounds. `now` is injected so the server and
 * a test can agree on what "today" means.
 */
export function resolveRange(
  preset: RangePreset,
  options?: { from?: string | null; to?: string | null; now?: Date },
): DateRange {
  const now = options?.now ?? new Date();

  const p = storeParts(now);

  switch (preset) {
    case "today":
      return { from: dayStart(now), to: dayEnd(now) };
    case "yesterday": {
      const y = shiftDays(now, -1);
      return { from: dayStart(y), to: dayEnd(y) };
    }
    case "last7":
      return { from: dayStart(shiftDays(now, -6)), to: dayEnd(now) };
    case "last30":
      return { from: dayStart(shiftDays(now, -29)), to: dayEnd(now) };
    case "last90":
      return { from: dayStart(shiftDays(now, -89)), to: dayEnd(now) };
    case "thisMonth":
      return { from: storeDate(p.year, p.month, 1), to: dayEnd(now) };
    case "lastMonth": {
      const first = storeDate(p.year, p.month - 1, 1);
      // Day 0 of this month is the last day of the previous one.
      const last = storeDate(p.year, p.month, 0, 23, 59, 59, 999);
      return { from: first, to: last };
    }
    case "thisYear":
      return { from: storeDate(p.year, 0, 1), to: dayEnd(now) };
    case "custom": {
      const from = options?.from ? new Date(options.from) : null;
      const to = options?.to ? new Date(options.to) : null;
      if (!from || !to || Number.isNaN(+from) || Number.isNaN(+to)) {
        // Unparseable custom bounds fall back to the default view rather
        // than throwing a date error at someone reading a dashboard.
        return resolveRange("last30", { now });
      }
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      // A date input gives midnight UTC; read its calendar day, not its instant.
      return {
        from: storeDate(lo.getUTCFullYear(), lo.getUTCMonth(), lo.getUTCDate()),
        to: storeDate(
          hi.getUTCFullYear(), hi.getUTCMonth(), hi.getUTCDate(), 23, 59, 59, 999,
        ),
      };
    }
  }
}

/**
 * The equally-long window ending the instant before this one starts, so a
 * 7-day range compares against the 7 days before it.
 */
export function previousRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  return { from: new Date(to.getTime() - span), to };
}

export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const { year, month, day } = storeParts(d);
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * Percentage change, or null where the comparison would be meaningless.
 * Going from zero to something is not "infinite growth" — it has no
 * percentage, and inventing one would be a fabricated number.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type TimePoint = {
  bucket: string;
  label: string;
  revenueCents: number;
  orders: number;
  units: number;
  delivered: number;
  cancelled: number;
  profitCents: number | null;
};

export type Totals = {
  revenueCents: number;
  orders: number;
  units: number;
  aovCents: number;
  delivered: number;
  pending: number;
  cancelled: number;
  // Null when no sold item has a cost price on file — see the note in
  // analytics.ts about historical cost.
  profitCents: number | null;
  profitCoverageRevenueCents: number;
};

export type StatusSlice = { status: string; count: number; revenueCents: number };
export type ProductSlice = {
  id: string | null;
  name: string;
  sku: string;
  units: number;
  revenueCents: number;
};
export type CategorySlice = {
  name: string;
  units: number;
  revenueCents: number;
};
export type MovementPoint = {
  bucket: string;
  label: string;
} & Record<string, number | string>;
