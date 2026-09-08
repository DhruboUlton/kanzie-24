// How long an admin session may sit idle before it ends.
//
// No database import on purpose: the settings form needs the bounds to render
// its input, and the timeout warning runs in the browser. Same split as
// inventory-shared.ts.

export const SESSION_IDLE_KEY = "admin_session_idle_minutes";

export const DEFAULT_IDLE_MINUTES = 60;

// The floor is low enough to be genuinely strict but still long enough to
// write a product description without being thrown out mid-sentence. The
// ceiling is a day: past that it is not an idle timeout any more, and the
// point of the setting is that it cannot be switched off.
export const MIN_IDLE_MINUTES = 5;
export const MAX_IDLE_MINUTES = 1440;

/**
 * The one place this value is validated.
 *
 * Everything that reads or writes the setting goes through here — the server
 * action, the reader and the form — so a value out of range is impossible to
 * store rather than merely discouraged in the UI.
 */
export function clampIdleMinutes(value: unknown): number {
  // An empty field means "unset", not zero — and Number("") is 0, which would
  // otherwise clamp up to the floor and hand back the strictest possible
  // timeout to someone who just cleared the box.
  if (value === null || value === undefined) return DEFAULT_IDLE_MINUTES;
  if (typeof value === "string" && value.trim() === "") {
    return DEFAULT_IDLE_MINUTES;
  }

  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_IDLE_MINUTES;
  return Math.min(MAX_IDLE_MINUTES, Math.max(MIN_IDLE_MINUTES, n));
}
