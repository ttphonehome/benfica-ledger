import type { Dataset, Season } from "@/data/schema";

/** Seasons that have player rows, newest first. */
export function seasonsNewestFirst(d: Pick<Dataset, "playerSeasons">): Season[] {
  return [...new Set(d.playerSeasons.map((p) => p.season))].sort().reverse();
}

export function latestSeason(d: Pick<Dataset, "playerSeasons">): Season {
  const s = seasonsNewestFirst(d)[0];
  if (!s) throw new Error("Dataset has no seasons");
  return s;
}
