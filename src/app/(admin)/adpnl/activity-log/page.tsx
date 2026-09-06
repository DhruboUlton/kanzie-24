import ActivityLogClient from "@/components/admin/ActivityLogClient";
import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { getActivityActors, getActivityLog } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export default async function ActivityLogPage() {
  const { allowed } = await requirePageAccess("ACTIVITY_LOG_VIEW");
  if (!allowed) return <NoAccess what="the activity log" />;

  const [entries, actors] = await Promise.all([
    getActivityLog({ limit: 200 }),
    getActivityActors(),
  ]);

  return <ActivityLogClient entries={entries} actors={actors} />;
}
