"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { changeOwnPasswordAction } from "@/lib/actions/auth";

export default function ChangePasswordDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await changeOwnPasswordAction({
        currentPassword: current,
        newPassword: next,
      });
      if (res.success) {
        setDone(true);
        setTimeout(onClose, 1600);
      } else {
        setError(res.error || "That didn't work.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  // text-gray-900 is not decoration: this dialog is rendered from inside
  // AdminSidebar, whose root carries text-white for the dark nav. An input
  // that sets no colour of its own inherits that, so every character typed
  // into a password field was white on the panel's white background — and
  // the caret with it, since caret-color follows color.
  const inputClass =
    "w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#c0282b]";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      {/* Resets the inherited text-white from the sidebar this is mounted
          in, so any field added here later is legible by default. */}
      <div className="relative bg-white text-gray-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-accent" />
            <span>Change your password</span>
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
          {done && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Password changed.</span>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Current password
            </label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoFocus
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              New password
            </label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={10}
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">At least 10 characters.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className={inputClass}
            />
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
              disabled={saving || done}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Change password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
