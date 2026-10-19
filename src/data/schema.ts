import { z } from "zod";

// Every model is defined once here as a zod schema. The TypeScript types are
// inferred from it, and the same schema validates rows when a data source
// loads them, so a bad CSV or API response fails loudly instead of rendering.
// Money is in millions of euros. Dates are ISO (YYYY-MM-DD).

export const seasonId = z.string().regex(/^\d{4}-\d{2}$/, "Season must look like 2025-26");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const count = z.number().int().nonnegative();

export const POSITIONS = ["GK", "CB", "LB", "RB", "LWB", "RWB", "DF", "DM", "CM", "AM", "LM", "RM", "MF", "LW", "RW", "ST", "FW"] as const;
export const position = z.enum(POSITIONS);

export const origin = z.enum(["academy", "signed"]);

// Where the player stood at the end of the season.
export const playerStatus = z.enum(["stay", "sold", "loan-out", "released", "loan-in-ended"]);

export const playerSeasonSchema = z.object({
  playerId: z.string().min(1),
  player: z.string().min(1),
  season: seasonId,
  pos: position,
  origin,
  nat: z.string().nullable(),
  apps: count,
  mins: count,
  minsEstimated: z.boolean(),
  goals: count,
  assists: count.nullable(),
  rating: z.number().min(1).max(10).nullable(),
  status: playerStatus,
});

export const TRANSFER_TYPES = ["permanent", "loan-in", "loan-out", "free", "loan-end", "academy-promo"] as const;
export const transferSchema = z.object({
  id: z.string().min(1),
  playerId: z.string().min(1),
  player: z.string().min(1),
  season: seasonId,
  dir: z.enum(["in", "out"]),
  /** Transfer date, when the source has one. */
  date: isoDate.nullable().optional(),
  type: z.enum(TRANSFER_TYPES),
  fee: z.number().nonnegative().nullable(),
  club: z.string(),
  pos: position.nullable(),
  age: z.number().int().positive().nullable(),
});

export const injurySchema = z.object({
  id: z.string().min(1),
  playerId: z.string().min(1),
  player: z.string().min(1),
  season: seasonId,
  type: z.string(),
  out: isoDate,
  back: isoDate.nullable(),
  weeks: count,
  matches: count,
  notes: z.string().nullable(),
});

// "Positions" dataset: a player's role profile, independent of season.
export const playerProfileSchema = z.object({
  playerId: z.string().min(1),
  player: z.string().min(1),
  primary: position,
  secondary: position.nullable(),
  foot: z.enum(["L", "R", "B"]),
  role: z.string(),
});

// Fee breakdown for one transfer, joined on transferId. Optional per transfer.
export const transferDetailSchema = z.object({
  transferId: z.string().min(1),
  baseFee: z.number().nonnegative().nullable(),
  addOns: z.number().nonnegative().nullable(),
  sellOnPct: z.number().min(0).max(100).nullable(),
  contractUntil: isoDate.nullable(),
  sourceUrl: z.url().nullable(),
});

export const seasonContextSchema = z.object({
  season: seasonId,
  finish: z.string(),
  points: count,
  manager: z.string(),
  goalsFor: count,
  goalsAgainst: count,
  competitions: z.string(),
});

const formationRecordSchema = z.object({
  name: z.string(),
  matches: count,
  w: count,
  d: count,
  l: count,
  gf: count,
  ga: count,
});

export const managerSeasonSchema = z.object({
  season: seasonId,
  wins: count,
  draws: count,
  losses: count,
  gf: count,
  ga: count,
  finish: z.number().int().positive().nullable(),
  leaguePoints: count,
  competitions: z.array(z.string()),
  formations: z.array(formationRecordSchema),
  academyMinutesPct: z.number().min(0).max(100).nullable(),
  youthPromoted: z.array(z.string()),
  avgStartXIAge: z.number().positive().nullable(),
  notes: z.string(),
  titles: z.array(z.string()),
});

export const managerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  nick: z.string(),
  appointed: isoDate,
  departed: isoDate.nullable(),
  seasons: z.array(managerSeasonSchema),
});

export const presidentSeasonSchema = z.object({
  season: seasonId,
  manager: z.string(),
  wins: count,
  draws: count,
  losses: count,
  finish: z.number().int().positive().nullable(),
  leaguePoints: count,
  titles: z.array(z.string()),
  notes: z.string(),
});

export const presidentSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  nick: z.string(),
  appointed: isoDate,
  departed: isoDate.nullable(),
  notes: z.string(),
  seasons: z.array(presidentSeasonSchema),
  // The hire's record and titles come from the manager's own seasons.
  managersHired: z.array(
    z.object({
      managerId: z.string().min(1),
      verdict: z.enum(["good", "neutral", "bad"]),
      note: z.string(),
    }),
  ),
});

export const editorialNoteSchema = z.object({
  playerId: z.string().min(1),
  text: z.string(),
});

// How trustworthy a dataset or season is. Only "sourced" hides the data note.
export const provenance = z.enum(["illustrative", "unverified", "sourced"]);

export const DATASET_KEYS = [
  "playerSeasons",
  "transfers",
  "injuries",
  "profiles",
  "transferDetails",
  "seasonContext",
  "managers",
  "presidents",
  "notes",
] as const;

export const metaSchema = z.object({
  generatedAt: z.iso.datetime().nullable(),
  /** The date the data describes ("now" on timelines, tenure of people still in post). */
  asOf: isoDate,
  /** Seasons the data should cover: ideally from `firstSeason`, never less than from `minimumFirstSeason`. */
  coverageTarget: z.object({ firstSeason: seasonId, minimumFirstSeason: seasonId }),
  datasets: z.record(z.enum(DATASET_KEYS), provenance),
  seasons: z.record(
    seasonId,
    z.object({
      status: z.enum(["placeholder", "unverified", "sourced"]),
      note: z.string(),
    }),
  ),
});

export const datasetSchema = z.object({
  meta: metaSchema,
  playerSeasons: z.array(playerSeasonSchema),
  transfers: z.array(transferSchema),
  injuries: z.array(injurySchema),
  profiles: z.array(playerProfileSchema),
  transferDetails: z.array(transferDetailSchema),
  seasonContext: z.array(seasonContextSchema),
  managers: z.array(managerSchema),
  presidents: z.array(presidentSchema),
  notes: z.array(editorialNoteSchema),
});

export type Season = z.infer<typeof seasonId>;
export type Position = z.infer<typeof position>;
export type PlayerStatus = z.infer<typeof playerStatus>;
export type PlayerSeason = z.infer<typeof playerSeasonSchema>;
export type Transfer = z.infer<typeof transferSchema>;
export type TransferType = Transfer["type"];
export type Injury = z.infer<typeof injurySchema>;
export type PlayerProfile = z.infer<typeof playerProfileSchema>;
export type TransferDetail = z.infer<typeof transferDetailSchema>;
export type SeasonContext = z.infer<typeof seasonContextSchema>;
export type Manager = z.infer<typeof managerSchema>;
export type ManagerSeason = z.infer<typeof managerSeasonSchema>;
export type President = z.infer<typeof presidentSchema>;
export type PresidentSeason = z.infer<typeof presidentSeasonSchema>;
export type EditorialNote = z.infer<typeof editorialNoteSchema>;
export type Provenance = z.infer<typeof provenance>;
export type DatasetMeta = z.infer<typeof metaSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
