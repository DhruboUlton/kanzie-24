import BannerManagerClient from "@/components/admin/BannerManagerClient";
import { getHeroContentAction } from "@/lib/actions/hero";

export const dynamic = "force-dynamic";

export default async function BannerPage() {
  const initial = await getHeroContentAction();
  return <BannerManagerClient initial={initial} />;
}
