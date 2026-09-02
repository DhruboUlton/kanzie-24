"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { createStaffAction, updateStaffAction } from "@/lib/actions/staff";
import type { RoleOption, StaffRowView } from "@/components/admin/StaffClient";

export default function StaffFormDialog({
  roles,
  staff,
  onClose,
  onSaved,
}: {
  roles: RoleOption[];
  staff: StaffRowView | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = !!staff;
  const [name, setName] = useState(staff?.name ?? "");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(staff?.roleId ?? roles[0]?.id ?? "");
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
      const res = editing
        ? await updateStaffAction({ id: staff!.id, name, email, roleId })
        : await createStaffAction({ name, email, password, roleId });

      if (res.success) {
        onSaved(editing ? `${name} updated.` : `${name} added.`);
      } else {
        setError(res.error || "That didn't work.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900">
            {editing ? "Edit staff member" : "Add staff member"}
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

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              This is what they sign in with.
            </p>
          </div>

          {!editing && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Temporary password
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                className={`${inputClass} font-mono`}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                At least 10 characters. Give it to them directly and ask them
                to change it from their own account.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              className={inputClass}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              What they can do is decided entirely by this role.
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
              <span>{editing ? "Save changes" : "Add staff"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
