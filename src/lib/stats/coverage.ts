import type { Dataset, Season } from "@/data/schema";
import { seasonsNewestFirst } from "./seasons";

/** "2016-17" -> "2017-18" */
export function nextSeason(s: Season): Season {
  const y = Number(s.slice(0, 4)) + 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export function seasonRange(first: Season, last: Season): Season[] {
  const out: Season[] = [];
  for (let s = first; s <= last; s = nextSeason(s)) out.push(s);
  return out;
}

export interface Coverage {
  target: Season[];
  minimum: Season[];
  /** Target seasons with player rows, transfers and season context. */
  covered: Season[];
  missing: Season[];
  meetsMinimum: boolean;
}

// What share of the target window the data actually covers. A season counts
// only when it has player rows, transfers and season context.
export function coverage(d: Dataset): Coverage {
  const latest = seasonsNewestFirst(d)[0] ?? d.meta.coverageTarget.minimumFirstSeason;
  const target = seasonRange(d.meta.coverageTarget.firstSeason, latest);
  const minimum = seasonRange(d.meta.coverageTarget.minimumFirstSeason, latest);
  const has = (s: Season) =>
    d.playerSeasons.some((p) => p.season === s) &&
    d.transfers.some((t) => t.season === s) &&
    d.seasonContext.some((c) => c.season === s);
  const covered = target.filter(has);
  return {
    target,
    minimum,
    covered,
    missing: target.filter((s) => !has(s)),
    meetsMinimum: minimum.every(has),
  };
}
