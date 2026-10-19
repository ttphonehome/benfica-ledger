// Calendar maths on ISO dates (YYYY-MM-DD), in UTC so results don't depend
// on the machine's time zone.

const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const YEAR_MS = 365.25 * 24 * 3600 * 1000;

export function yearsBetween(from: string, to: string): number {
  return (ms(to) - ms(from)) / YEAR_MS;
}

/** Whole calendar months from one date to another (day of month respected). */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

/** Position of a date on a [start, end] axis, 0-100, clamped. */
export function axisPct(iso: string, start: string, end: string): number {
  const t = (ms(iso) - ms(start)) / (ms(end) - ms(start));
  return Math.max(0, Math.min(100, t * 100));
}
