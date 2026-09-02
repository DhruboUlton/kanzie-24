"use client";

import { ReactNode } from "react";
import { ChartColumn } from "lucide-react";

// Shared frame so every chart on the page has the same header, height and
// empty state instead of each one inventing its own.
export default function ChartCard({
  title,
  subtitle,
  action,
  isEmpty,
  emptyMessage = "No data in this period.",
  height = "h-72",
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden ${className}`}
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>

      <div className={`p-4 ${height}`}>
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
            <ChartColumn className="w-6 h-6" />
            <p className="text-xs">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
