import { FRIENDLY_LEAGUE_IDS, TEAM_ID } from "../config";
import { parseTransferType } from "../lib/fees";
import { windowSeason } from "../lib/seasons";
import type { TransferType } from "../../src/data/schema";

// Minimal shapes of the API-Football responses we read (see pipeline/probe.mjs).
export interface ApiPlayerEntry {
  player: { id: number; name: string; firstname: string | null; lastname: string | null; birth?: { date: string | null }; nationality: string | null };
  statistics: {
    team: { id: number };
    league: { id: number; name: string };
    games: { appearences: number | null; lineups: number | null; minutes: number | null; position: string | null; rating: string | null };
    goals: { total: number | null; assists: number | null };
  }[];
}
export interface ApiInjury {
  player: { id: number; name: string; type: string; reason: string };
  fixture: { id: number; date: string };
  league: { id: number; name: string };
}
export interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number; name: string; round: string };
  teams: { home: { id: number; name: string; winner: boolean | null }; away: { id: number; name: string; winner: boolean | null } };
  goals: { home: number | null; away: number | null };
}
export interface ApiTransferPlayer {
  player: { id: number; name: string };
  transfers: { date: string; type: string | null; teams: { in: { id: number; name: string }; out: { id: number; name: string } } }[];
}
export interface ApiStandingRow {
  rank: number;
  team: { id: number };
  points: number;
  all: { played: number; goals: { for: number; against: number } };
}
export interface ApiCoach {
  id: number;
  name: string;
  career: { team: { id: number }; start: string | null; end: string | null }[];
}
export interface ApiTrophy {
  league: string;
  country: string;
  season: string;
  place: string;
}

export interface ApiPlayerSeason {
  apiId: number;
  apiName: string;
  firstname: string | null;
  lastname: string | null;
  birthDate: string | null;
  nationality: string | null;
  position: "GK" | "DF" | "MF" | "FW" | null;
  apps: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  /** Minutes-weighted average of competition ratings; null without any. */
  rating: number | null;
}

const POSITION: Record<string, ApiPlayerSeason["position"]> = { Goalkeeper: "GK", Defender: "DF", Midfielder: "MF", Attacker: "FW" };

/** One row per player, summing Benfica's competitions (friendlies excluded). */
export function playerSeasons(entries: ApiPlayerEntry[]): ApiPlayerSeason[] {
  const out: ApiPlayerSeason[] = [];
  for (const e of entries) {
    const stats = e.statistics.filter((s) => s.team.id === TEAM_ID && !FRIENDLY_LEAGUE_IDS.has(s.league.id));
    let apps = 0, starts = 0, minutes = 0, goals = 0, assists = 0, wSum = 0, wMins = 0;
    let position: ApiPlayerSeason["position"] = null;
    for (const s of stats) {
      apps += s.games.appearences ?? 0;
      starts += s.games.lineups ?? 0;
      minutes += s.games.minutes ?? 0;
      goals += s.goals.total ?? 0;
      assists += s.goals.assists ?? 0;
      position ??= POSITION[s.games.position ?? ""] ?? null;
      const r = s.games.rating ? Number(s.games.rating) : NaN;
      const m = s.games.minutes ?? 0;
      if (Number.isFinite(r) && m > 0) {
        wSum += r * m;
        wMins += m;
      }
    }
    if (apps === 0) continue; // squad members who never played are not roster rows
    out.push({
      apiId: e.player.id,
      apiName: e.player.name,
      firstname: e.player.firstname,
      lastname: e.player.lastname,
      birthDate: e.player.birth?.date ?? null,
      nationality: e.player.nationality,
      position,
      apps,
      starts,
      minutes,
      goals,
      assists,
      rating: wMins ? Math.round((wSum / wMins) * 100) / 100 : null,
    });
  }
  return out;
}

export interface InjurySpell {
  apiId: number;
  apiName: string;
  reason: string;
  out: string;
  lastMissed: string;
  matches: number;
  weeks: number;
}

const NOT_INJURY = /card|suspen|international|personal|coach|rest|inactive|unknown/i;

/**
 * API-Football lists each fixture a player missed. Consecutive misses for the
 * same reason, no more than 3 weeks apart, form one spell. Only "Missing
 * Fixture" entries count (not "Questionable"), and suspensions are skipped.
 */
export function injurySpells(rows: ApiInjury[]): InjurySpell[] {
  const missed = rows
    .filter((r) => r.player.type === "Missing Fixture" && !NOT_INJURY.test(r.player.reason))
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));
  const spells: InjurySpell[] = [];
  const open = new Map<string, InjurySpell>();
  for (const r of missed) {
    const key = `${r.player.id}|${r.player.reason}`;
    const day = r.fixture.date.slice(0, 10);
    const cur = open.get(key);
    if (cur && Date.parse(day) - Date.parse(cur.lastMissed) <= 21 * 86400_000) {
      if (day !== cur.lastMissed) cur.matches++;
      cur.lastMissed = day;
    } else {
      const s: InjurySpell = { apiId: r.player.id, apiName: r.player.name, reason: r.player.reason, out: day, lastMissed: day, matches: 1, weeks: 0 };
      spells.push(s);
      open.set(key, s);
    }
  }
  // Days from first to last missed fixture, inclusive, in whole weeks.
  for (const s of spells) s.weeks = Math.max(1, Math.ceil((Date.parse(s.lastMissed) - Date.parse(s.out) + 86400_000) / (7 * 86400_000)));
  return spells;
}

export interface Result {
  fixtureId: number;
  date: string;
  league: string;
  leagueId: number;
  result: "w" | "d" | "l";
  gf: number;
  ga: number;
}

const PLAYED = new Set(["FT", "AET", "PEN"]);

/** Benfica's finished competitive matches. Penalty shoot-outs count as draws. */
export function results(fixtures: ApiFixture[]): Result[] {
  return fixtures
    .filter((f) => PLAYED.has(f.fixture.status.short) && !FRIENDLY_LEAGUE_IDS.has(f.league.id))
    .map((f) => {
      const home = f.teams.home.id === TEAM_ID;
      const gf = (home ? f.goals.home : f.goals.away) ?? 0;
      const ga = (home ? f.goals.away : f.goals.home) ?? 0;
      const result: Result["result"] = gf > ga ? "w" : gf < ga ? "l" : "d";
      return { fixtureId: f.fixture.id, date: f.fixture.date.slice(0, 10), league: f.league.name, leagueId: f.league.id, result, gf, ga };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface ApiMove {
  apiId: number;
  apiName: string;
  date: string;
  season: string;
  dir: "in" | "out";
  type: TransferType;
  fee: number | null;
  club: string;
  rawType: string | null;
}

/** Benfica's moves from the full transfer history, deduplicated. */
export function moves(players: ApiTransferPlayer[]): ApiMove[] {
  const seen = new Set<string>();
  const out: ApiMove[] = [];
  for (const p of players) {
    for (const t of p.transfers) {
      const dir = t.teams.in.id === TEAM_ID ? "in" : t.teams.out.id === TEAM_ID ? "out" : null;
      if (!dir || !t.date) continue;
      const date = t.date.slice(0, 10);
      const key = `${p.player.id}|${date}|${dir}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const parsed = parseTransferType(t.type, dir);
      out.push({
        apiId: p.player.id,
        apiName: p.player.name,
        date,
        season: windowSeason(date),
        dir,
        ...parsed,
        club: dir === "in" ? t.teams.out.name : t.teams.in.name,
        rawType: t.type,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Coach stints at Benfica from the coaches endpoint (often incomplete). */
export function coachStints(coaches: ApiCoach[]): { apiId: number; name: string; start: string | null; end: string | null }[] {
  return coaches.flatMap((c) =>
    c.career.filter((x) => x.team.id === TEAM_ID).map((x) => ({ apiId: c.id, name: c.name, start: x.start, end: x.end })),
  );
}

/** Portuguese trophies a coach won in a given season ("2022/2023" -> "2022-23"). */
export function wonTrophies(trophies: ApiTrophy[]): { season: string; competition: string }[] {
  return trophies
    .filter((t) => t.place === "Winner" && t.country === "Portugal")
    .map((t) => {
      const m = /^(\d{4})\/(\d{4})$/.exec(t.season);
      const season = m ? `${m[1]}-${m[2].slice(2)}` : t.season;
      const competition = t.league === "Super Cup" ? "Supertaça" : t.league;
      return { season, competition };
    });
}
