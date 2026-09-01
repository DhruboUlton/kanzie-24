import BannerManagerClient from "@/components/admin/BannerManagerClient";
import { getHeroContentAction } from "@/lib/actions/hero";
import { getBodyBannerContentAction } from "@/lib/actions/body-banner";

export const dynamic = "force-dynamic";

export default async function BannerPage() {
  const [hero, body] = await Promise.all([
    getHeroContentAction(),
    getBodyBannerContentAction(),
  ]);
  return <BannerManagerClient hero={hero} body={body} />;
}
