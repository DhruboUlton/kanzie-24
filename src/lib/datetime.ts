// The store runs on Bangladesh time. The server does not: Hostinger's
// container is UTC, so a client component calling toLocaleDateString()
// renders a different string than the server did and React throws a
// hydration mismatch (error #418) — which it recovers from by discarding
// the server HTML and re-rendering, causing a visible flicker.
//
// Pinning the zone makes both sides agree AND puts dates in the timezone the
// shop actually trades in. Bangladesh has no daylight saving, so the offset
// is a constant +6.

export const STORE_TIME_ZONE = "Asia/Dhaka";
export const STORE_UTC_OFFSET_HOURS = 6;

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: STORE_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    timeZone: STORE_TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeLong(
  value: Date | string | null | undefined,
): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    timeZone: STORE_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Wall-clock parts in store time, whatever timezone the caller runs in. */
export function storeParts(d: Date): {
  year: number;
  month: number;
  day: number;
} {
  const shifted = new Date(d.getTime() + STORE_UTC_OFFSET_HOURS * 3_600_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/** The UTC instant of a store-time wall clock. */
export function storeDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0,
): Date {
  return new Date(
    Date.UTC(year, month, day, hours - STORE_UTC_OFFSET_HOURS, minutes, seconds, ms),
  );
}
