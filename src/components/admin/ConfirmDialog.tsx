"use client";

import { useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

// Shared confirmation for destructive admin actions.
export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  destructive = true,
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-6"
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="w-9 h-9 rounded-full bg-red-50 text-[#c0282b] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            {body && <p className="text-sm text-gray-500 mt-1.5">{body}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
              destructive
                ? "bg-[#c0282b] hover:bg-[#8f1e20]"
                : "bg-gray-900 hover:bg-black"
            }`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
