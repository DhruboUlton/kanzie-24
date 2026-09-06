import BannerManagerClient from "@/components/admin/BannerManagerClient";
import { getHeroContentAction } from "@/lib/actions/hero";
import { getBodyBannerContentAction } from "@/lib/actions/body-banner";
import { getBrandStripAction } from "@/lib/actions/brand-strip";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function BannerPage() {
  const { allowed } = await requirePageAccess("BANNER_VIEW");
  if (!allowed) return <NoAccess what="the homepage banners" />;

  const [hero, body, brandStrip] = await Promise.all([
    getHeroContentAction(),
    getBodyBannerContentAction(),
    getBrandStripAction(),
  ]);
  return <BannerManagerClient hero={hero} body={body} brandStrip={brandStrip} />;
}
