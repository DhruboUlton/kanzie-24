import { db } from "@/lib/db";
import {
  SESSION_IDLE_KEY,
  DEFAULT_IDLE_MINUTES,
  clampIdleMinutes,
} from "@/lib/session-policy-shared";

/**
 * The configured idle window, in minutes.
 *
 * Falls back to the default rather than throwing: this is read on the sign-in
 * path and on every admin request, and a settings row that is missing or
 * unreadable must not be able to lock anyone out of the admin panel.
 */
export async function getSessionIdleMinutes(): Promise<number> {
  try {
    const row = await db.siteSetting.findUnique({
      where: { key: SESSION_IDLE_KEY },
    });
    if (!row) return DEFAULT_IDLE_MINUTES;
    return clampIdleMinutes(row.value);
  } catch {
    return DEFAULT_IDLE_MINUTES;
  }
}
