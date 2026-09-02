import BannerManagerClient from "@/components/admin/BannerManagerClient";
import { getHeroContentAction } from "@/lib/actions/hero";
import { getBodyBannerContentAction } from "@/lib/actions/body-banner";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function BannerPage() {
  const { allowed } = await requirePageAccess("BANNER_VIEW");
  if (!allowed) return <NoAccess what="the homepage banners" />;

  const [hero, body] = await Promise.all([
    getHeroContentAction(),
    getBodyBannerContentAction(),
  ]);
  return <BannerManagerClient hero={hero} body={body} />;
}
