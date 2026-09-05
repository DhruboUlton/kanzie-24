"use client";

import { useState } from "react";

// TODO: wire up to a real email provider (e.g. Resend, Mailchimp) via an
// API route. This just simulates success so the UI is testable.
export default function Newsletter({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setStatus("sent");
      }}
      className="flex flex-col gap-2"
    >
      {!compact && (
        <p className="text-sm text-white/60 mb-1">
          New products and drop alerts. No spam.
        </p>
      )}
      <div className="flex">
        <input
          type="email"
          required
          placeholder="Email address"
          className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-l px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="bg-accent hover:bg-accent-dark transition-colors text-white text-sm font-semibold px-4 rounded-r"
        >
          Join
        </button>
      </div>
      {status === "sent" && (
        <p className="text-xs text-accent">Thanks — you&apos;re on the list.</p>
      )}
    </form>
  );
}
