"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { createRoleAction, updateRoleAction } from "@/lib/actions/roles";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  Permission,
} from "@/lib/permissions";
import type { RoleView } from "@/components/admin/RolesClient";

export default function RoleFormDialog({
  role,
  grantable,
  onClose,
  onSaved,
}: {
  role: RoleView | null;
  /**
   * What the signed-in admin holds themselves. They can't grant beyond it —
   * see ungrantable() in src/lib/actions/roles.ts, which is the real check.
   * Permissions the role already has stay togglable so an edit can still
   * remove them.
   */
  grantable: Permission[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = !!role;
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Permission[]>(role?.permissions ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canToggle = (p: Permission) =>
    grantable.includes(p) || (role?.permissions.includes(p) ?? false);

  const toggle = (p: Permission) => {
    if (!canToggle(p)) return;
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  };

  const toggleGroup = (keys: Permission[]) => {
    const usable = keys.filter(canToggle);
    if (usable.length === 0) return;
    setSelected((s) =>
      usable.every((k) => s.includes(k))
        ? s.filter((x) => !usable.includes(x))
        : Array.from(new Set([...s, ...usable])),
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = editing
        ? await updateRoleAction({
            id: role!.id,
            name,
            description,
            permissions: selected,
          })
        : await createRoleAction({ name, description, permissions: selected });

      if (res.success) {
        onSaved(editing ? `${name} updated.` : `${name} created.`);
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
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <h3 className="text-base font-bold text-gray-900">
            {editing ? `Edit ${role!.name}` : "New role"}
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

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Role name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="e.g. Warehouse Assistant"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this role is for"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Permissions
                </h4>
                <span className="text-[11px] text-gray-400">
                  {selected.length} selected
                </span>
              </div>

              {PERMISSION_GROUPS.map((group) => {
                const usable = group.keys.filter(canToggle);
                const all =
                  usable.length > 0 && usable.every((k) => selected.includes(k));
                return (
                  <div
                    key={group.label}
                    className="rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-bold text-gray-700">
                        {group.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.keys)}
                        disabled={usable.length === 0}
                        className="text-[11px] font-semibold text-accent hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        {all ? "Clear all" : "Select all"}
                      </button>
                    </div>
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.keys.map((key) => {
                        const locked = !canToggle(key);
                        return (
                          <label
                            key={key}
                            title={
                              locked
                                ? "You don't hold this permission, so you can't grant it."
                                : undefined
                            }
                            className={`flex items-start gap-2 group ${
                              locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(key)}
                              onChange={() => toggle(key)}
                              disabled={locked}
                              className="mt-0.5 accent-[#c0282b]"
                            />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold text-gray-800 group-hover:text-gray-900">
                                {PERMISSIONS[key]}
                              </span>
                              <span className="block text-[10px] font-mono text-gray-400">
                                {key}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || selected.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editing ? "Save role" : "Create role"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
