// Fixed facts the pipeline relies on. IDs come from the API-Football probe.
export const TEAM_ID = 211; // Benfica
export const LEAGUE_ID = 94; // Primeira Liga
export const FRIENDLY_LEAGUE_IDS = new Set([667]); // "Friendlies Clubs"

export const PATHS = {
  cache: "data/cache",
  manual: "data/manual",
  snapshot: "data/snapshot",
  placeholder: "data/placeholder",
} as const;

/** Requests to keep in hand on the free plan's 100/day, for manual reruns. */
export const QUOTA_RESERVE = 10;
