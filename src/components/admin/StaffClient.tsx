"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  UserPlus,
  Pencil,
  KeyRound,
  Power,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import StaffFormDialog from "@/components/admin/StaffFormDialog";
import ResetPasswordDialog from "@/components/admin/ResetPasswordDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  deleteStaffAction,
  setStaffActiveAction,
} from "@/lib/actions/staff";
import { OWNER_ROLE_KEY, Permission } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/datetime";

export type StaffRowView = {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleKey: string | null;
  roleName: string | null;
  isActive: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
};

export type RoleOption = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
};

function lastLogin(value: Date | string | null) {
  return value ? formatDateTime(value) : "Never";
}

export default function StaffClient({
  staff,
  roles,
  currentUserId,
  permissions,
}: {
  staff: StaffRowView[];
  roles: RoleOption[];
  currentUserId: string;
  permissions: Permission[];
}) {
  const router = useRouter();
  const can = (p: Permission) => permissions.includes(p);

  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffRowView | null>(null);
  const [resetting, setResetting] = useState<StaffRowView | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "delete" | "disable" | "enable"; row: StaffRowView }
    | null
  >(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const activeOwners = useMemo(
    () => staff.filter((s) => s.roleKey === OWNER_ROLE_KEY && s.isActive).length,
    [staff],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.roleName ?? "").toLowerCase().includes(q),
    );
  }, [staff, query]);

  // Mirrors assertNotLastOwner() on the server. Disabling a button here is
  // a courtesy; the action refuses regardless of what the UI allows.
  const isLastOwner = (row: StaffRowView) =>
    row.roleKey === OWNER_ROLE_KEY && row.isActive && activeOwners <= 1;

  function announce(message: string) {
    setFlash(message);
    setTimeout(() => setFlash(null), 4000);
  }

  async function run(id: string, fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fn();
      if (res.success) {
        announce(ok);
        router.refresh();
      } else {
        setError(res.error || "That didn't work.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            <span>Staff</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Who can sign in to the admin, and what each of them can do
          </p>
        </div>
        {can("STAFF_CREATE") && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add staff</span>
          </button>
        )}
      </div>

      {flash && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{flash}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or role"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#c0282b]"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 hidden md:table-cell">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Last login</th>
                <th className="px-4 py-3 hidden xl:table-cell">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-500">
                    No staff match that search.
                  </td>
                </tr>
              )}

              {visible.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="truncate max-w-[12rem]">{row.name}</span>
                      {row.id === currentUserId && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate max-w-[14rem]">
                      {row.email}
                    </p>
                    <span className="md:hidden inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-gray-600">
                      <ShieldCheck className="w-3 h-3" />
                      {row.roleName ?? "No role"}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                        row.roleKey === OWNER_ROLE_KEY
                          ? "bg-[#c0282b]/10 text-[#c0282b] border-[#c0282b]/20"
                          : row.roleName
                            ? "bg-gray-100 text-gray-700 border-gray-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {row.roleName ?? "No role"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                        row.isActive
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-gray-200 text-gray-600 border-gray-300"
                      }`}
                    >
                      {row.isActive ? "ACTIVE" : "DISABLED"}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-600 whitespace-nowrap">
                    {lastLogin(row.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-gray-600 whitespace-nowrap">
                    {formatDate(row.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {busyId === row.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      )}

                      {can("STAFF_EDIT") && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(row)}
                            title="Edit"
                            aria-label={`Edit ${row.name}`}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetting(row)}
                            title="Reset password"
                            aria-label={`Reset password for ${row.name}`}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {can("STAFF_DISABLE") && row.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({
                              kind: row.isActive ? "disable" : "enable",
                              row,
                            })
                          }
                          disabled={row.isActive && isLastOwner(row)}
                          title={
                            row.isActive && isLastOwner(row)
                              ? "The only owner can't be deactivated"
                              : row.isActive
                                ? "Deactivate"
                                : "Activate"
                          }
                          aria-label={`${row.isActive ? "Deactivate" : "Activate"} ${row.name}`}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}

                      {can("STAFF_DELETE") && row.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => setConfirm({ kind: "delete", row })}
                          disabled={isLastOwner(row)}
                          title={
                            isLastOwner(row)
                              ? "The only owner can't be deleted"
                              : "Delete"
                          }
                          aria-label={`Delete ${row.name}`}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || editing) && (
        <StaffFormDialog
          roles={roles}
          staff={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={(message) => {
            setAdding(false);
            setEditing(null);
            announce(message);
            router.refresh();
          }}
        />
      )}

      {resetting && (
        <ResetPasswordDialog
          staff={resetting}
          onClose={() => setResetting(null)}
          onSaved={() => {
            announce(`Password reset for ${resetting.name}.`);
            setResetting(null);
            router.refresh();
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === "delete"
              ? `Delete ${confirm.row.name}?`
              : confirm.kind === "disable"
                ? `Deactivate ${confirm.row.name}?`
                : `Activate ${confirm.row.name}?`
          }
          body={
            confirm.kind === "delete"
              ? "Their account is removed for good. What they did stays in the activity log."
              : confirm.kind === "disable"
                ? "They stay in the list but can't sign in until you activate them again."
                : "They'll be able to sign in again straight away."
          }
          confirmLabel={
            confirm.kind === "delete"
              ? "Delete account"
              : confirm.kind === "disable"
                ? "Deactivate"
                : "Activate"
          }
          destructive={confirm.kind !== "enable"}
          busy={busyId === confirm.row.id}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            confirm.kind === "delete"
              ? run(
                  confirm.row.id,
                  () => deleteStaffAction(confirm.row.id),
                  `${confirm.row.name} deleted.`,
                )
              : run(
                  confirm.row.id,
                  () => setStaffActiveAction(confirm.row.id, confirm.kind === "enable"),
                  `${confirm.row.name} ${confirm.kind === "enable" ? "activated" : "deactivated"}.`,
                )
          }
        />
      )}
    </div>
  );
}
