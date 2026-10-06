import type { Metadata } from "next";
import { Briefcase } from "lucide-react";

export const metadata: Metadata = {
  title: "Careers",
  description: "KANZIE has no ongoing recruitment right now. Stay tuned.",
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white">
        <Briefcase className="h-6 w-6" />
      </span>
      <h1 className="mt-6 font-display text-4xl sm:text-5xl tracking-wide">
        CAREERS
      </h1>
      <p className="mt-6 text-xl sm:text-2xl text-ink">
        No ongoing recruitment right now.
      </p>
      <p className="mt-3 text-black/70">
        Stay tuned — new opportunities will be announced here when they open.
      </p>
    </div>
  );
}
