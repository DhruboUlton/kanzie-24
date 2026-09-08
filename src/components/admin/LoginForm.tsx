"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { loginAdminAction } from "@/lib/actions/auth";
import { safeAdminDestination } from "@/lib/admin-redirect";
import { REMEMBER_ME_DAYS } from "@/lib/session-policy-shared";

// Why the sign-in screen is being shown, when it wasn't asked for. Saying
// "you were idle" rather than the generic ending stops it reading as a fault.
function signInNotice(reason: string | null): string | null {
  if (reason === "idle") {
    return "Signed out after a spell of inactivity. Please sign in again.";
  }
  if (reason === "session-ended") {
    return "Your session has ended. Please sign in again.";
  }
  return null;
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    signInNotice(searchParams.get("reason")),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await loginAdminAction(email, password, remember);
      if (res.success) {
        // Validated, not trusted: `from` is attacker-reachable, and
        // router.push happily hard-navigates to another origin.
        router.push(safeAdminDestination(searchParams.get("from")));
        router.refresh();
      } else {
        setError(res.error || "Failed to sign in. Check email and password.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Brand Banner */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c0282b] text-white font-extrabold text-2xl shadow-xl shadow-[#c0282b]/30 mb-4">
          KZ
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          KANZIE Admin
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Sign in to manage catalog, orders, and store settings
        </p>
      </div>

      {/* Card Form */}
      <div className="bg-[#181818] border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c0282b] focus:ring-1 focus:ring-[#c0282b] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="block w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c0282b] focus:ring-1 focus:ring-[#c0282b] transition-colors"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 accent-[#c0282b] cursor-pointer"
            />
            <span>
              <span className="block text-sm text-white/80">
                Keep me signed in on this device
              </span>
              <span className="block text-[11px] text-white/40 mt-0.5">
                Skips the inactivity timeout here for {REMEMBER_ME_DAYS} days.
                Leave it off on shared or public computers.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#c0282b] hover:bg-[#8f1e20] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#c0282b]/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign in to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Info Box */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            <span>Encrypted Session</span>
          </span>
          <span>Hostinger MySQL Ready</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
