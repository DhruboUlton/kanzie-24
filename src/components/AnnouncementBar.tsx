import { db } from "@/lib/db";

export default async function AnnouncementBar() {
  let announcementText = "FREE SHIPPING on orders over ৳5,000 · Use code DIGIN10 for 10% off your first order";
  let enabled = true;

  try {
    const textRecord = await db.siteSetting.findUnique({
      where: { key: "announcement_text" },
    });
    const enabledRecord = await db.siteSetting.findUnique({
      where: { key: "announcement_enabled" },
    });

    if (textRecord?.value) announcementText = textRecord.value;
    if (enabledRecord?.value === "false") enabled = false;
  } catch {
    // fallback if db is offline
  }

  if (!enabled) return null;

  return (
    <div className="bg-ink text-white text-xs sm:text-sm text-center py-2 px-4">
      {announcementText}
    </div>
  );
}
