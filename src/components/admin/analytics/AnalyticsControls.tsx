"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Download, Loader2, GitCompareArrows } from "lucide-react";
import { formatDate } from "@/lib/datetime";
import {
  RANGE_LABELS,
  RANGE_PRESETS,
  RangePreset,
  toDateInput,
} from "@/lib/analytics-shared";

// Range and comparison live in the URL, so the whole page re-renders on the
// server with the new window rather than shipping every order to the browser
// and slicing it there.
export default function AnalyticsControls({
  preset,
  range,
  compare,
  onExport,
}: {
  preset: RangePreset;
  range: { from: string; to: string };
  compare: boolean;
  onExport: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [customFrom, setCustomFrom] = useState(toDateInput(new Date(range.from)));
  const [customTo, setCustomTo] = useState(toDateInput(new Date(range.to)));

  const push = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => router.push(`/admin/analytics?${params.toString()}`));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(range.from)} – {formatDate(range.to)}
            {pending && (
              <span className="inline-flex items-center gap-1 ml-2 text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                updating
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => push({ compare: compare ? null : "1" })}
            aria-pressed={compare}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              compare
                ? "bg-[#c0282b] text-white border-[#c0282b]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <GitCompareArrows className="w-4 h-4" />
            <span>Compare with previous</span>
          </button>

          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-gray-200">
        {RANGE_PRESETS.filter((p) => p !== "custom").map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => push({ range: p, from: null, to: null })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              preset === p
                ? "bg-[#c0282b] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {RANGE_LABELS[p]}
          </button>
        ))}

        <div
          className={`flex items-center gap-1.5 ml-auto pl-2 border-l border-gray-200 ${
            preset === "custom" ? "" : "opacity-70"
          }`}
        >
          <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
            aria-label="Custom range start"
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => setCustomTo(e.target.value)}
            aria-label="Custom range end"
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
          />
          <button
            type="button"
            onClick={() =>
              push({ range: "custom", from: customFrom, to: customTo })
            }
            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
