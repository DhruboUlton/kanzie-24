"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Users,
} from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import RoleFormDialog from "@/components/admin/RoleFormDialog";
import { deleteRoleAction } from "@/lib/actions/roles";
import {
  OWNER_ROLE_KEY,
  PERMISSIONS,
  Permission,
} from "@/lib/permissions";

export type RoleView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
};

export default function RolesClient({
  roles,
  permissions,
}: {
  roles: RoleView[];
  permissions: Permission[];
}) {
  const router = useRouter();
  const canManage = permissions.includes("ROLES_MANAGE");

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RoleView | null>(null);
  const [confirm, setConfirm] = useState<RoleView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  function announce(message: string) {
    setFlash(message);
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleDelete(role: RoleView) {
    setBusy(true);
    setError(null);
    try {
      const res = await deleteRoleAction(role.id);
      if (res.success) {
        announce(`${role.name} deleted.`);
        router.refresh();
      } else {
        setError(res.error || "That didn't work.");
      }
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span>Roles &amp; Permissions</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            A role is a bundle of permissions. Everyone on staff has exactly
            one.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New role</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {roles.map((role) => {
          const isOwner = role.key === OWNER_ROLE_KEY;
          return (
            <div
              key={role.id}
              className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="truncate">{role.name}</span>
                    {role.isSystem && (
                      <span
                        title="Built in — can't be deleted"
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded"
                      >
                        <Lock className="w-3 h-3" />
                        built in
                      </span>
                    )}
                  </h3>
                  {role.description && (
                    <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    {role.userCount} {role.userCount === 1 ? "person" : "people"}
                  </p>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditing(role)}
                      disabled={isOwner}
                      title={
                        isOwner
                          ? "The Owner role always has every permission"
                          : "Edit role"
                      }
                      aria-label={`Edit ${role.name}`}
                      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm(role)}
                      disabled={role.isSystem || role.userCount > 0}
                      title={
                        role.isSystem
                          ? "Built-in roles can't be deleted"
                          : role.userCount > 0
                            ? "Move its staff to another role first"
                            : "Delete role"
                      }
                      aria-label={`Delete ${role.name}`}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {isOwner ? (
                  <span className="text-[11px] font-semibold text-[#c0282b] bg-[#c0282b]/10 border border-[#c0282b]/20 px-2 py-0.5 rounded-full">
                    Everything, including permissions added later
                  </span>
                ) : (
                  role.permissions.map((p) => (
                    <span
                      key={p}
                      title={PERMISSIONS[p]}
                      className="text-[10px] font-mono font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded"
                    >
                      {p}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(creating || editing) && (
        <RoleFormDialog
          role={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(message) => {
            setCreating(false);
            setEditing(null);
            announce(message);
            router.refresh();
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={`Delete the ${confirm.name} role?`}
          body="Nobody is using it, so nothing loses access."
          confirmLabel="Delete role"
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => handleDelete(confirm)}
        />
      )}
    </div>
  );
}
