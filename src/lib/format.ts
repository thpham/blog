/**
 * Date formatting for metadata. Content dates are parsed from YAML as UTC
 * midnight, so every formatter reads them in UTC: the printed day never
 * depends on the build machine's time zone.
 */

/** `2024-12-18`: the date format of every metadata line. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `Oct 2026`: used for "verified <month>". */
export function monthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}
