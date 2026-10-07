import { unstable_cache } from "next/cache";
import { SITE_CHROME_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";

const DEFAULT_TEXT =
  "FREE SHIPPING on orders over ৳5,000 · Use code DIGIN10 for 10% off your first order";

// One row-set instead of the two findUnique calls this used to make, and
// cached: the bar renders on every storefront page, so an uncached read here
// costs a database connection per visitor no matter what the rest of the page
// does. updateSettingsAction purges it, so an edit still shows at once.
const readAnnouncement = unstable_cache(
  async () => {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: ["announcement_text", "announcement_enabled"] } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      text: map.get("announcement_text") || DEFAULT_TEXT,
      enabled: map.get("announcement_enabled") !== "false",
    };
  },
  ["site-chrome:announcement"],
  { revalidate: false, tags: [SITE_CHROME_TAG] },
);

export default async function AnnouncementBar() {
  let announcement = { text: DEFAULT_TEXT, enabled: true };
  try {
    announcement = await readAnnouncement();
  } catch {
    // The bar is decoration; an unreachable database should not take the
    // whole storefront shell down with it. Caught out here rather than
    // inside, so a failed read is never the thing that gets cached.
  }

  if (!announcement.enabled) return null;

  return (
    <div className="bg-ink text-white text-xs sm:text-sm text-center py-2 px-4">
      {announcement.text}
    </div>
  );
}
