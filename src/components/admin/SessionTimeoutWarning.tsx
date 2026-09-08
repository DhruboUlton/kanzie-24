"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2 } from "lucide-react";
import { logoutAdminAction } from "@/lib/actions/auth";

// Warns before an idle session lapses, so nobody loses a half-written product
// description to a silent redirect.
//
// This is the courtesy, not the control. The session ends because the token
// expires and the middleware turns it away; nothing here is trusted to
// enforce anything. Tampering with this component buys an attacker a dialog
// that never appears, not a session that never ends.

const WARN_BEFORE_SECONDS = 60;

// Activity is sampled rather than recorded: a mousemove fires continuously,
// and re-rendering on each one to store a timestamp would cost more than the
// feature is worth.
const ACTIVITY_SAMPLE_MS = 5_000;
const TICK_MS = 1_000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "mousemove",
] as const;

export default function SessionTimeoutWarning({
  idleMinutes,
}: {
  idleMinutes: number;
}) {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const lastSample = useRef(0);
  const signingOut = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const windowMs = idleMinutes * 60_000;

  const markActive = useCallback(() => {
    const now = Date.now();
    if (now - lastSample.current < ACTIVITY_SAMPLE_MS) return;
    lastSample.current = now;
    lastActivity.current = now;
  }, []);

  useEffect(() => {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true });
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive);
      }
    };
  }, [markActive]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (signingOut.current) return;

      const remainingMs = windowMs - (Date.now() - lastActivity.current);
      const remaining = Math.ceil(remainingMs / 1000);

      if (remaining <= 0) {
        signingOut.current = true;
        setSecondsLeft(0);
        // Clear the cookies deliberately rather than waiting to be bounced,
        // so the staff marker goes too and the storefront stops treating this
        // browser as staff.
        void logoutAdminAction().finally(() => {
          window.location.href = "/adpnl/login?reason=idle";
        });
        return;
      }

      setSecondsLeft(remaining <= WARN_BEFORE_SECONDS ? remaining : null);
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [windowMs]);

  function staySignedIn() {
    lastActivity.current = Date.now();
    lastSample.current = Date.now();
    setSecondsLeft(null);
    // Any request through the middleware slides the token; a refresh is the
    // cheapest one that is guaranteed to go there.
    router.refresh();
  }

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        role="alertdialog"
        aria-labelledby="session-timeout-title"
        className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="session-timeout-title"
              className="text-base font-bold text-gray-900"
            >
              Still there?
            </h3>
            <p className="text-xs text-gray-500">
              You&rsquo;ll be signed out for inactivity.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          Signing out in{" "}
          <span className="font-bold text-gray-900 tabular-nums">
            {secondsLeft}s
          </span>
          . Anything you haven&rsquo;t saved will be lost.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={signingOut.current}
            onClick={staySignedIn}
            className="px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {signingOut.current && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            <span>Stay signed in</span>
          </button>
        </div>
      </div>
    </div>
  );
}
