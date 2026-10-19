// Display formatting. Inputs are exact numbers; rounding happens only here.
// Money is in millions of euros.

export const DASH = "—";
const MINUS = "−";

/** A single fee, e.g. €0.9m, €12m. Matches the reference's precision rules. */
export function fmtMoney(m: number | null | undefined): string {
  if (m == null) return DASH;
  if (m === 0) return "€0";
  const abs = Math.abs(m);
  const sign = m < 0 ? MINUS : "";
  return abs >= 10 ? `${sign}€${abs.toFixed(0)}m` : `${sign}€${abs.toFixed(1)}m`;
}

/** A total, always whole €m: €105m. */
export function fmtTotal(m: number): string {
  return `€${Math.round(m)}m`;
}

/** A signed whole-€m balance: +€47m, −€5m, €0. */
export function fmtNet(m: number): string {
  const r = Math.round(m);
  if (r === 0) return "€0";
  return `${r > 0 ? "+" : MINUS}€${Math.abs(r)}m`;
}

export function fmtMins(m: number | null | undefined): string {
  return m == null ? DASH : m.toLocaleString("en-GB");
}

export function fmtRating(r: number | null | undefined): string {
  return r == null ? DASH : r.toFixed(1);
}

export type RatingBand = "hi" | "mid" | "lo";
export function ratingBand(r: number): RatingBand {
  if (r >= 7.3) return "hi";
  if (r >= 6.7) return "mid";
  return "lo";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2023-01-09 -> "Jan 09, 2023" */
export function fmtDay(iso: string | null): string {
  if (!iso) return DASH;
  const [y, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${d}, ${y}`;
}

/** 2023-01-09 -> "Jan 2023" */
export function fmtMonth(iso: string | null): string {
  if (!iso) return DASH;
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}
