import type { PlayerSeason } from "@/data/schema";
import type { SeasonSpending } from "./spending";
import type { DictKey } from "@/i18n/dictionaries/en";

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
  labels: { top: DictKey; bottom: DictKey; note: DictKey };
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
      labels: { top: "overview.top", bottom: "overview.bottom", note: "overview.min10" },
    };
  }
  return {
    mode: "fallback",
    top: [...rows].sort((a, b) => b.goals - a.goals).slice(0, 3),
    bottom: [...rows].sort((a, b) => b.mins - a.mins).slice(0, 3),
    labels: { top: "overview.topScorers", bottom: "overview.mostMinutes", note: "overview.noRatingsYet" },
  };
}

export function windowVerdict(s: Pick<SeasonSpending, "net">): DictKey {
  if (s.net < -60) return "window.heavy";
  if (s.net < -20) return "window.reinforce";
  if (s.net > 50) return "window.selling";
  if (s.net > 0) return "window.positive";
  return "window.modest";
}
