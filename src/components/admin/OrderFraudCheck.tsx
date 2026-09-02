"use client";

import { useState } from "react";
import { ShieldAlert, Loader2, RotateCw } from "lucide-react";
import { checkFraudAction } from "@/lib/actions/fraud-check";
import type { CourierResult, FraudCheckResult } from "@/lib/fraud-check";

// Per-order courier history, fetched on demand.
//
// The check is three merchant logins and three lookups against Pathao, RedX
// and Steadfast, so it is never run automatically — an orders list of fifty
// rows would be a hundred and fifty courier calls. It runs when someone asks
// for this order, and the answer stays until the page reloads.

type Totals = { success: number; total: number; answered: number };

function couriers(result: FraudCheckResult): CourierResult[] {
  return [result.pathao, result.redx, result.steadfast];
}

function totals(result: FraudCheckResult): Totals {
  return couriers(result).reduce<Totals>(
    (acc, r) =>
      r.status
        ? {
            success: acc.success + r.data.success,
            total: acc.total + r.data.total,
            answered: acc.answered + 1,
          }
        : acc,
    { success: 0, total: 0, answered: 0 },
  );
}

function percent({ success, total }: Totals): number | null {
  return total > 0 ? Math.round((success / total) * 100) : null;
}

/**
 * Nothing answered is not the same as nothing found. With no courier
 * credentials saved, all three come back "not configured" and the totals are
 * zero — reporting that as "no history" would read as a clean customer, which
 * is the opposite of what it means.
 */
function unavailableReason(result: FraudCheckResult): string | null {
  const rows = couriers(result);
  if (rows.some((r) => r.status)) return null;
  return rows.every((r) => !r.status && /not configured/i.test(r.message))
    ? "Not set up"
    : "Check failed";
}

// Green above 80% delivered, amber down to half, red below. A customer with
// no courier history at all is grey, not green — unknown is not good.
function tone(pct: number | null): string {
  if (pct === null) return "bg-gray-100 text-gray-600 border-gray-200";
  if (pct >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (pct >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function courierLine(label: string, r: CourierResult): string {
  if (!r.status) return `${label} —`;
  return `${label} ${r.data.success}/${r.data.total}`;
}

export default function OrderFraudCheck({
  phone,
  className = "",
}: {
  phone: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FraudCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await checkFraudAction(phone);
      if (res.success) {
        setResult(res.result);
      } else {
        setError(res.error || "Check failed.");
      }
    } catch {
      setError("Check failed.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold ${className}`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Checking…</span>
      </span>
    );
  }

  if (error) {
    return (
      <button
        type="button"
        onClick={run}
        title={error}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors ${className}`}
      >
        <RotateCw className="w-3.5 h-3.5" />
        <span>Retry check</span>
      </button>
    );
  }

  if (result) {
    const t = totals(result);
    const pct = percent(t);
    const unavailable = unavailableReason(result);
    const detail = [
      courierLine("Pathao", result.pathao),
      courierLine("RedX", result.redx),
      courierLine("Steadfast", result.steadfast),
    ].join(" · ");

    if (unavailable) {
      const why = couriers(result)
        .map((r, i) => `${["Pathao", "RedX", "Steadfast"][i]}: ${r.status ? "ok" : r.message}`)
        .join("\n");
      return (
        <button
          type="button"
          onClick={run}
          title={`${why}\n\nAdd courier logins under Fraud Check.`}
          className={`inline-flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border bg-amber-50 border-amber-200 text-amber-800 text-left transition-opacity hover:opacity-80 ${className}`}
        >
          <span className="text-xs font-bold whitespace-nowrap">{unavailable}</span>
          <span className="text-[10px] font-medium opacity-80 whitespace-nowrap">
            No courier replied
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={run}
        title={`${detail}\n${t.answered} of 3 couriers replied\nClick to re-check`}
        className={`inline-flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border text-left transition-opacity hover:opacity-80 ${tone(pct)} ${className}`}
      >
        <span className="text-xs font-bold whitespace-nowrap">
          {pct === null ? "No history" : `${pct}% delivered`}
        </span>
        <span className="text-[10px] font-medium opacity-80 whitespace-nowrap">
          {t.success}/{t.total} parcels
          {t.answered < 3 ? ` · ${t.answered}/3 couriers` : ""}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:border-[#c0282b] hover:text-[#c0282b] transition-colors whitespace-nowrap ${className}`}
    >
      <ShieldAlert className="w-3.5 h-3.5" />
      <span>Fraud Check</span>
    </button>
  );
}
