import type { Season, Transfer } from "@/data/schema";

export interface SeasonSpending {
  season: Season;
  /** Exact sum of permanent incoming fees (€m). */
  spent: number;
  /** Exact sum of permanent outgoing fees (€m). */
  received: number;
  /**
   * Received minus spent, from the whole-€m totals, so the three numbers on
   * screen always add up. Differs from the exact balance by under €1m.
   */
  net: number;
  bought: number;
  sold: number;
  /** Permanent deals with an undisclosed fee: excluded from the sums. */
  undisclosedIn: number;
  undisclosedOut: number;
  loansIn: number;
  loansOut: number;
  frees: number;
  /** Mean disclosed permanent incoming fee (€m), or null with none. */
  avgFee: number | null;
}

const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);

// Only permanent deals count toward fees. Loan fees and loan-end payments are
// excluded on purpose, as are free transfers and academy promotions.
export function seasonSpending(transfers: Transfer[], season: Season): SeasonSpending {
  const rows = transfers.filter((t) => t.season === season);
  const permIn = rows.filter((t) => t.dir === "in" && t.type === "permanent");
  const permOut = rows.filter((t) => t.dir === "out" && t.type === "permanent");
  const knownIn = permIn.filter((t) => t.fee != null);
  const knownOut = permOut.filter((t) => t.fee != null);
  const spent = sum(knownIn.map((t) => t.fee!));
  const received = sum(knownOut.map((t) => t.fee!));
  return {
    season,
    spent,
    received,
    net: Math.round(received) - Math.round(spent),
    bought: permIn.length,
    sold: permOut.length,
    undisclosedIn: permIn.length - knownIn.length,
    undisclosedOut: permOut.length - knownOut.length,
    loansIn: rows.filter((t) => t.dir === "in" && t.type === "loan-in").length,
    loansOut: rows.filter((t) => t.dir === "out" && t.type === "loan-out").length,
    frees: rows.filter((t) => t.type === "free").length,
    avgFee: knownIn.length ? spent / knownIn.length : null,
  };
}

export interface SpendingTotals {
  seasons: SeasonSpending[];
  /** Sums of each season's whole-€m figure, so columns add up on screen. */
  spent: number;
  received: number;
  net: number;
  avgNet: number;
  bought: number;
  /** Largest single bar, for scaling. */
  max: number;
}

/** All seasons, oldest first, plus totals. */
export function spendingTotals(transfers: Transfer[], seasonsNewestFirst: Season[]): SpendingTotals {
  const seasons = [...seasonsNewestFirst].reverse().map((s) => seasonSpending(transfers, s));
  const spent = seasons.reduce((a, s) => a + Math.round(s.spent), 0);
  const received = seasons.reduce((a, s) => a + Math.round(s.received), 0);
  return {
    seasons,
    spent,
    received,
    net: received - spent,
    avgNet: seasons.length ? (received - spent) / seasons.length : 0,
    bought: seasons.reduce((a, s) => a + s.bought, 0),
    max: Math.max(1, ...seasons.map((s) => Math.max(Math.round(s.spent), Math.round(s.received)))),
  };
}

/** Whether any transfer rows exist for a season (spend is unknown otherwise). */
export function hasTransferData(transfers: Transfer[], season: Season): boolean {
  return transfers.some((t) => t.season === season);
}
