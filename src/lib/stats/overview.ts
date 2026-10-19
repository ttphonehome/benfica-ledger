import type { PlayerSeason } from "@/data/schema";
import type { SeasonSpending } from "./spending";

export interface SquadStats {
  squadSize: number;
  /** 0-100, or null for an empty squad. */
  academySharePct: number | null;
  academyMinutesPct: number | null;
  /** Mean rating of players with 10+ apps and a rating; null when none. */
  avgRating: number | null;
}

export function squadStats(rows: PlayerSeason[]): SquadStats {
  const academy = rows.filter((p) => p.origin === "academy");
  const totalMins = rows.reduce((a, p) => a + p.mins, 0);
  const rated = rows.filter((p) => p.apps >= 10 && p.rating != null);
  return {
    squadSize: rows.length,
    academySharePct: rows.length ? (academy.length / rows.length) * 100 : null,
    academyMinutesPct: totalMins ? (academy.reduce((a, p) => a + p.mins, 0) / totalMins) * 100 : null,
    avgRating: rated.length ? rated.reduce((a, p) => a + p.rating!, 0) / rated.length : null,
  };
}

export interface Performers {
  mode: "rating" | "fallback";
  top: PlayerSeason[];
  bottom: PlayerSeason[];
  labels: { top: string; bottom: string; note: string };
}

// Top and bottom three by rating (10+ apps). With fewer than three rated
// players, falls back to top scorers and most minutes.
export function performers(rows: PlayerSeason[]): Performers {
  const rated = rows
    .filter((p) => p.apps >= 10 && p.rating != null)
    .sort((a, b) => b.rating! - a.rating!);
  if (rated.length >= 3) {
    return {
      mode: "rating",
      top: rated.slice(0, 3),
      bottom: rated.slice(-3).reverse(),
      labels: { top: "Top performers", bottom: "Bottom performers", note: "Min. 10 appearances" },
    };
  }
  return {
    mode: "fallback",
    top: [...rows].sort((a, b) => b.goals - a.goals).slice(0, 3),
    bottom: [...rows].sort((a, b) => b.mins - a.mins).slice(0, 3),
    labels: { top: "Top scorers", bottom: "Most minutes", note: "Ratings not yet available" },
  };
}

export function windowVerdict(s: Pick<SeasonSpending, "net">): string {
  if (s.net < -60) return "A heavy-spend window. The board put real money down, and now the squad has to repay it.";
  if (s.net < -20) return "Net spend tilted toward outgoing cash; a reinforcement window, not a rebuild.";
  if (s.net > 50) return "A selling window. Talent walked out the door for a profit.";
  if (s.net > 0) return "A neutral-to-positive window. Cashflow held the line.";
  return "Modest movement. The squad was largely left alone.";
}
