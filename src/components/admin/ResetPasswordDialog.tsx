"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { resetStaffPasswordAction } from "@/lib/actions/staff";
import type { StaffRowView } from "@/components/admin/StaffClient";

export default function ResetPasswordDialog({
  staff,
  onClose,
  onSaved,
}: {
  staff: StaffRowView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await resetStaffPasswordAction(staff.id, password);
      if (res.success) onSaved();
      else setError(res.error || "That didn't work.");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-accent" />
            <span>Reset password</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-sm text-gray-600">
            Set a new password for <strong>{staff.name}</strong> ({staff.email}).
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              New password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              autoFocus
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-[#c0282b]"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              At least 10 characters. Their old password stops working
              immediately.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Reset password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
