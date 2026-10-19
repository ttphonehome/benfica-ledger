import type { Dataset, Injury, PlayerSeason, Season, Transfer } from "@/data/schema";

export interface RosterRow extends PlayerSeason {
  weeksInjured: number;
}

export function rosterRows(d: Pick<Dataset, "playerSeasons" | "injuries">, season: Season): RosterRow[] {
  return d.playerSeasons
    .filter((p) => p.season === season)
    .map((p) => ({
      ...p,
      weeksInjured: d.injuries
        .filter((i) => i.playerId === p.playerId && i.season === season)
        .reduce((a, i) => a + i.weeks, 0),
    }));
}

/** Sort by rating when the season has ratings, otherwise by appearances. */
export function defaultRosterSort(rows: Pick<PlayerSeason, "rating">[]): "rating" | "apps" {
  return rows.some((r) => r.rating != null) ? "rating" : "apps";
}

export interface PlayerHistory {
  playerId: string;
  name: string;
  seasons: PlayerSeason[];
  arrivals: Transfer[];
  departures: Transfer[];
  injuries: Injury[];
}

/** Everything known about one player, oldest season first, moves newest first. */
export function playerHistory(
  d: Pick<Dataset, "playerSeasons" | "transfers" | "injuries">,
  playerId: string,
): PlayerHistory | null {
  const seasons = d.playerSeasons
    .filter((p) => p.playerId === playerId)
    .sort((a, b) => a.season.localeCompare(b.season));
  if (!seasons.length) return null;
  const moves = d.transfers
    .filter((t) => t.playerId === playerId)
    .sort((a, b) => b.season.localeCompare(a.season));
  return {
    playerId,
    name: seasons[seasons.length - 1].player,
    seasons,
    arrivals: moves.filter((t) => t.dir === "in"),
    departures: moves.filter((t) => t.dir === "out"),
    injuries: d.injuries
      .filter((i) => i.playerId === playerId)
      .sort((a, b) => a.out.localeCompare(b.out)),
  };
}

/** Which metric a career chart should plot: ratings if any exist, else minutes. */
export function careerMetric(seasons: Pick<PlayerSeason, "rating">[]): "rating" | "mins" {
  return seasons.some((s) => s.rating != null) ? "rating" : "mins";
}

/** Latest season a player appears in, for #player= deep links. */
export function latestSeasonFor(
  d: Pick<Dataset, "playerSeasons">,
  match: (p: PlayerSeason) => boolean,
): { season: Season; playerId: string } | null {
  const rows = d.playerSeasons.filter(match).sort((a, b) => b.season.localeCompare(a.season));
  return rows[0] ? { season: rows[0].season, playerId: rows[0].playerId } : null;
}
