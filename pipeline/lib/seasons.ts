// Season helpers. A season runs 1 July to 30 June; API-Football names a
// season by its start year (2025 = 2025-26).

export const seasonOfYear = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
export const startYear = (season: string) => Number(season.slice(0, 4));

/** The season a date falls in (1 July to 30 June). */
export function seasonOfDate(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return seasonOfYear(m >= 7 ? y : y - 1);
}

/**
 * The transfer window a move belongs to. Summer moves (June to August) count
 * for the season that starts that summer, so 2 June 2025 is a 2025-26 move.
 */
export function windowSeason(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return seasonOfYear(m >= 6 ? y : y - 1);
}
