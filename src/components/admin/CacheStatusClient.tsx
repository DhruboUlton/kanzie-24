"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import {
  checkCacheAction,
  rebuildPagesAction,
  type CacheRow,
  type CacheState,
} from "@/lib/actions/cache";

const STATES: Record<CacheState, { label: string; note: string; className: string }> = {
  HIT: {
    label: "Saved",
    note: "Served from the saved copy",
    className: "bg-emerald-50 text-emerald-700",
  },
  MISS: {
    label: "Built now",
    note: "Had no saved copy; this check built and saved it",
    className: "bg-amber-50 text-amber-700",
  },
  STALE: {
    label: "Old copy",
    note: "An old copy was served while a new one was built",
    className: "bg-orange-50 text-orange-700",
  },
  LIVE: {
    label: "Not cached",
    note: "Built fresh on every visit, by design",
    className: "bg-gray-100 text-gray-600",
  },
  ERROR: {
    label: "Failed",
    note: "The page did not load",
    className: "bg-red-50 text-red-700",
  },
};

export default function CacheStatusClient({ canRefresh }: { canRefresh: boolean }) {
  const [rows, setRows] = useState<CacheRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"check" | "rebuild" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // "Not cached" pages are built on every visit anyway; nothing to rebuild.
  const selectable = rows?.filter((r) => r.state !== "LIVE").map((r) => r.path) ?? [];
  const allSelected = selectable.length > 0 && selected.size === selectable.length;

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function handleCheck() {
    setBusy("check");
    setError(null);
    const res = await checkCacheAction();
    if (res.success) {
      setRows(res.rows);
      setSelected(new Set());
    } else setError(res.error);
    setBusy(null);
  }

  async function handleRebuild() {
    setBusy("rebuild");
    setError(null);
    const res = await rebuildPagesAction([...selected]);
    if (!res.success) {
      setError(res.error);
      setBusy(null);
      return;
    }
    // Visiting them is what builds them again; merge the fresh states in.
    const check = await checkCacheAction(res.paths);
    if (check.success) {
      const fresh = new Map(check.rows.map((r) => [r.path, r.state]));
      setRows((prev) => prev?.map((r) => ({ ...r, state: fresh.get(r.path) ?? r.state })) ?? null);
      setSelected(new Set());
    } else setError(check.error);
    setBusy(null);
  }

  const counts = rows?.reduce<Partial<Record<CacheState, number>>>((acc, r) => {
    acc[r.state] = (acc[r.state] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Cache Status</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Shop pages are built once and saved until something is changed in
          the admin. Checking visits every page, so any page without a saved
          copy gets one.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCheck}
            disabled={busy !== null}
            className="px-4 py-2 bg-[#c0282b] hover:bg-[#a02225] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {busy === "check" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Check status</span>
          </button>

          {canRefresh && rows && (
            <button
              type="button"
              onClick={handleRebuild}
              disabled={busy !== null || selected.size === 0}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {busy === "rebuild" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Rebuild selected{selected.size > 0 ? ` (${selected.size})` : ""}</span>
            </button>
          )}

          {busy && (
            <span className="text-[11px] text-gray-500">
              Visiting {busy === "rebuild" ? "the selected pages" : "every page"}, up to 15 seconds&hellip;
            </span>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {counts && (
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(STATES) as CacheState[])
              .filter((s) => counts[s])
              .map((s) => (
                <span key={s} className={`text-[11px] font-bold px-2 py-1 rounded ${STATES[s].className}`}>
                  {counts[s]} {STATES[s].label}
                </span>
              ))}
          </div>
        )}

        {rows && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                {canRefresh && (
                  <th className="py-2 pr-2 w-6">
                    <input
                      type="checkbox"
                      aria-label="Select all pages"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(selectable))}
                      disabled={busy !== null || selectable.length === 0}
                      className="accent-[#c0282b]"
                    />
                  </th>
                )}
                <th className="py-2 font-semibold">Page</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.path} className="border-b border-gray-100">
                  {canRefresh && (
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.path}`}
                        checked={selected.has(r.path)}
                        onChange={() => toggle(r.path)}
                        disabled={busy !== null || r.state === "LIVE"}
                        className="accent-[#c0282b]"
                      />
                    </td>
                  )}
                  <td className="py-2 pr-3 font-mono text-gray-800 break-all">
                    <a href={r.path} target="_blank" rel="noopener noreferrer" className="hover:text-[#c0282b]">
                      {r.path}
                    </a>
                  </td>
                  <td className="py-2" title={STATES[r.state].note}>
                    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${STATES[r.state].className}`}>
                      {STATES[r.state].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <ul className="text-[11px] text-gray-500 space-y-0.5">
          {(Object.keys(STATES) as CacheState[]).map((s) => (
            <li key={s}>
              <span className="font-bold">{STATES[s].label}</span> &mdash; {STATES[s].note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
