"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PackageCheck,
  PackageX,
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { checkFraudAction } from "@/lib/actions/fraud-check";
import { updateCourierCredentialsAction } from "@/lib/actions/courier-credentials";
import { CourierResult, FraudCheckResult } from "@/lib/fraud-check";
import { CourierCredentialsStatus } from "@/lib/courier-credentials";

const COURIERS: { key: "pathao" | "redx" | "steadfast"; label: string }[] = [
  { key: "pathao", label: "Pathao" },
  { key: "redx", label: "RedX" },
  { key: "steadfast", label: "Steadfast" },
];

function riskLevel(result: CourierResult): {
  label: string;
  className: string;
  icon: typeof ShieldCheck;
} {
  if (!result.status) {
    return { label: "Unavailable", className: "bg-gray-100 text-gray-500", icon: ShieldQuestion };
  }
  if (result.data.total === 0) {
    return { label: "No history", className: "bg-gray-100 text-gray-500", icon: ShieldQuestion };
  }
  if (result.data.returnPercentage >= 30) {
    return { label: "High risk", className: "bg-red-50 text-red-700", icon: ShieldX };
  }
  if (result.data.returnPercentage >= 10) {
    return { label: "Medium risk", className: "bg-amber-50 text-amber-700", icon: ShieldAlert };
  }
  return { label: "Low risk", className: "bg-emerald-50 text-emerald-700", icon: ShieldCheck };
}

function CourierCard({ label, result }: { label: string; result: CourierResult }) {
  const risk = riskLevel(result);
  const Icon = risk.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">{label}</h3>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full ${risk.className}`}
        >
          <Icon className="w-3.5 h-3.5" />
          {risk.label}
        </span>
      </div>

      {result.status ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{result.data.total}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <PackageCheck className="w-3 h-3 text-emerald-500" /> Delivered
            </p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">
              {result.data.deliveredPercentage}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <PackageX className="w-3 h-3 text-red-500" /> Returned
            </p>
            <p className="text-lg font-bold text-red-600 tabular-nums">
              {result.data.returnPercentage}%
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">{result.message}</p>
      )}
    </div>
  );
}

type CredentialField = {
  key: "pathao" | "redx" | "steadfast";
  label: string;
  idLabel: string;
  idType: "text" | "tel" | "email";
  idPlaceholder: string;
  idValueKey: "user" | "phone";
};

const CREDENTIAL_FIELDS: CredentialField[] = [
  {
    key: "pathao",
    label: "Pathao",
    idLabel: "Pathao Username",
    idType: "text",
    idPlaceholder: "merchant username",
    idValueKey: "user",
  },
  {
    key: "redx",
    label: "RedX",
    idLabel: "RedX Phone Number",
    idType: "tel",
    idPlaceholder: "01XXXXXXXXX",
    idValueKey: "phone",
  },
  {
    key: "steadfast",
    label: "Steadfast",
    idLabel: "Steadfast Email",
    idType: "email",
    idPlaceholder: "you@example.com",
    idValueKey: "user",
  },
];

function CourierCredentialsPanel({ initialStatus }: { initialStatus: CourierCredentialsStatus }) {
  const router = useRouter();
  const allConfigured =
    initialStatus.pathao.hasPassword &&
    initialStatus.redx.hasPassword &&
    initialStatus.steadfast.hasPassword;

  const [open, setOpen] = useState(!allConfigured);
  const [ids, setIds] = useState({
    pathao: initialStatus.pathao.user,
    redx: initialStatus.redx.phone,
    steadfast: initialStatus.steadfast.user,
  });
  const [passwords, setPasswords] = useState({ pathao: "", redx: "", steadfast: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await updateCourierCredentialsAction({
        pathaoUser: ids.pathao,
        pathaoPassword: passwords.pathao || undefined,
        redxPhone: ids.redx,
        redxPassword: passwords.redx || undefined,
        steadfastUser: ids.steadfast,
        steadfastPassword: passwords.steadfast || undefined,
      });

      if (res.success) {
        setSaveSuccess(true);
        setPasswords({ pathao: "", redx: "", steadfast: "" });
        router.refresh();
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError(res.error || "Failed to save credentials");
      }
    } catch (err: any) {
      setSaveError(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-gray-900">Courier Credentials</h3>
          <span className="text-[11px] text-gray-400">
            {allConfigured ? "All three configured" : "Setup needed"}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {open && (
        <form onSubmit={handleSave} className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-5">
          <p className="text-[11px] text-gray-400 -mt-2">
            Your store&apos;s own merchant login with each courier — used to look up a customer&apos;s
            delivery history. Passwords are encrypted before they&apos;re stored and never shown
            again; leave a password field blank to keep the one already saved.
          </p>

          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Credentials saved.</span>
            </div>
          )}
          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CREDENTIAL_FIELDS.map((field) => {
              const status = initialStatus[field.key];
              return (
                <div key={field.key} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-900">{field.label}</p>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        status.hasPassword
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {status.hasPassword ? "Configured" : "Not set"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      {field.idLabel}
                    </label>
                    <input
                      type={field.idType}
                      value={ids[field.key]}
                      onChange={(e) => setIds((v) => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.idPlaceholder}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#c0282b]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={passwords[field.key]}
                      onChange={(e) => setPasswords((v) => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={status.hasPassword ? "•••••••• (saved)" : "Not set"}
                      autoComplete="new-password"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save Credentials</span>
          </button>
        </form>
      )}
    </div>
  );
}

export default function FraudCheckClient({
  initialCredentialsStatus,
  canManageCredentials,
}: {
  // null for everyone but the owner — the panel is not rendered for them,
  // and the status is never fetched in the first place.
  initialCredentialsStatus: CourierCredentialsStatus | null;
  canManageCredentials: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FraudCheckResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await checkFraudAction(phone);
      if (res.success) {
        setResult(res.result);
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-accent" />
          Fraud Checking
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Look up a customer&apos;s delivery history across Pathao, RedX, and Steadfast before
          confirming a COD order.
        </p>
      </div>

      {canManageCredentials && initialCredentialsStatus && (
        <CourierCredentialsPanel initialStatus={initialCredentialsStatus} />
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Customer Phone Number
        </label>
        <div className="flex gap-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            required
            className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-[#c0282b]"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Check</span>
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          Bangladeshi mobile number, e.g. 01712345678. Checks run against all three couriers at
          once.
        </p>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COURIERS.map(({ key, label }) => (
            <CourierCard key={key} label={label} result={result[key]} />
          ))}
        </div>
      )}
    </div>
  );
}
