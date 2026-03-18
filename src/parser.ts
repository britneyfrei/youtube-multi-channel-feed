import * as chrono from "chrono-node";

/**
 * Attempts to parse a date from a video title using chrono-node.
 * Only accepts dates where day, month, and year are all explicitly present.
 * Returns the first valid date found, or null if none qualify.
 */
export function parseDateFromTitle(title: string): Date | null {
  const results = chrono.parse(title);

  for (const result of results) {
    const start = result.start;
    if (
      start.isCertain("day") &&
      start.isCertain("month") &&
      start.isCertain("year")
    ) {
      return start.date();
    }
  }

  return null;
}
