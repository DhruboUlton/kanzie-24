"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { bootstrapOwnerAction } from "@/lib/actions/auth";

// Shown only while the store has no admin accounts at all. The action
// re-checks that condition inside a transaction, so this is a one-time door
// rather than a standing way in.
export default function SetupOwnerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await bootstrapOwnerAction({ name, email, password });
      if (res.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(res.error || "Couldn't complete setup.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "block w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c0282b] focus:ring-1 focus:ring-[#c0282b] transition-colors";

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c0282b] text-white font-extrabold text-2xl shadow-xl shadow-[#c0282b]/30 mb-4">
          KZ
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Set up KANZIE Admin
        </h2>
        <p className="mt-2 text-sm text-white/50">
          No admin account exists yet. Create the owner account to get started.
        </p>
      </div>

      <div className="bg-[#181818] border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              Your name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              Email address
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
                className={inputClass}
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
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              Confirm password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#c0282b] hover:bg-[#8f1e20] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#c0282b]/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating your account...</span>
              </>
            ) : (
              <>
                <span>Create owner account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-white/40">
          <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
          <span>This screen disappears once an account exists.</span>
        </div>
      </div>
    </div>
  );
}
