"use client";

import { useState } from "react";
import { Clapperboard, Film, Images, PanelBottom, Tags } from "lucide-react";
import HeroBannerForm from "@/components/admin/HeroBannerForm";
import BodyBannerForm from "@/components/admin/BodyBannerForm";
import BrandStripForm from "@/components/admin/BrandStripForm";
import VideoBannerForm from "@/components/admin/VideoBannerForm";
import ReelsForm from "@/components/admin/ReelsForm";
import { HeroContent } from "@/lib/hero";
import { BodyBannerContent } from "@/lib/body-banner";
import { BrandStripContent } from "@/lib/brand-strip";
import { VideoBannerContent } from "@/lib/video-banner";
import { ReelsContent } from "@/lib/reels";

// The homepage's editable furniture, each piece with its own save — kept
// on one screen because "banner" is where an admin looks for any of them.
const TABS = [
  { id: "hero", label: "Hero Banner", icon: Images },
  { id: "body", label: "Body Banner", icon: PanelBottom },
  { id: "brands", label: "Brand Strip", icon: Tags },
  { id: "video", label: "Video Banner", icon: Film },
  { id: "reels", label: "Reels", icon: Clapperboard },
] as const;

export default function BannerManagerClient({
  hero,
  body,
  brandStrip,
  videoBanner,
  reels,
}: {
  hero: HeroContent;
  body: BodyBannerContent;
  brandStrip: BrandStripContent;
  videoBanner: VideoBannerContent;
  reels: ReelsContent;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("hero");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="inline-flex max-w-full overflow-x-auto p-1 bg-gray-100 rounded-lg">
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
      <div hidden={tab !== "brands"}>
        <BrandStripForm initial={brandStrip} />
      </div>
      <div hidden={tab !== "video"}>
        <VideoBannerForm initial={videoBanner} />
      </div>
      <div hidden={tab !== "reels"}>
        <ReelsForm initial={reels} />
      </div>
    </div>
  );
}
