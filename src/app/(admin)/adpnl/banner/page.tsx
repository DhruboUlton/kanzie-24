import BannerManagerClient from "@/components/admin/BannerManagerClient";
import { getHeroContentAction } from "@/lib/actions/hero";
import { getBodyBannerContentAction } from "@/lib/actions/body-banner";
import { getBrandStripAction } from "@/lib/actions/brand-strip";
import { getVideoBannerAction } from "@/lib/actions/video-banner";
import { getReelsAction } from "@/lib/actions/reels";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function BannerPage() {
  const { allowed } = await requirePageAccess("BANNER_VIEW");
  if (!allowed) return <NoAccess what="the homepage banners" />;

  const [hero, body, brandStrip, videoBanner, reels] = await Promise.all([
    getHeroContentAction(),
    getBodyBannerContentAction(),
    getBrandStripAction(),
    getVideoBannerAction(),
    getReelsAction(),
  ]);
  return (
    <BannerManagerClient
      hero={hero}
      body={body}
      brandStrip={brandStrip}
      videoBanner={videoBanner}
      reels={reels}
    />
  );
}
