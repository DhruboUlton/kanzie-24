"use client";

import { useState } from "react";
import { Images, PanelBottom } from "lucide-react";
import HeroBannerForm from "@/components/admin/HeroBannerForm";
import BodyBannerForm from "@/components/admin/BodyBannerForm";
import { HeroContent } from "@/lib/hero";
import { BodyBannerContent } from "@/lib/body-banner";

// Two separate banners on the homepage, each with its own save — kept on
// one screen because "banner" is where an admin looks for either.
const TABS = [
  { id: "hero", label: "Hero Banner", icon: Images },
  { id: "body", label: "Body Banner", icon: PanelBottom },
] as const;

export default function BannerManagerClient({
  hero,
  body,
}: {
  hero: HeroContent;
  body: BodyBannerContent;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("hero");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="inline-flex p-1 bg-gray-100 rounded-lg">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === id
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Both stay mounted so switching tabs doesn't discard unsaved edits. */}
      <div hidden={tab !== "hero"}>
        <HeroBannerForm initial={hero} />
      </div>
      <div hidden={tab !== "body"}>
        <BodyBannerForm initial={body} />
      </div>
    </div>
  );
}
