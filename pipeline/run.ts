// Data refresh: fetch (through the repo cache), merge, validate, write the snapshot.
// Usage: API_FOOTBALL_KEY=... npx tsx pipeline/run.ts
// Without a key it rebuilds from data/cache only, so it also runs offline.
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { datasetSchema, type Dataset } from "../src/data/schema";
import { parseDataset } from "../src/data/parse";
import { LEAGUE_ID, PATHS, QUOTA_RESERVE, TEAM_ID } from "./config";
import { readCache, writeCache } from "./lib/cache";
import { seasonOfDate, seasonOfYear, startYear } from "./lib/seasons";
import { loadManual } from "./manual";
import { merge, type ApiSeasonData, type CoachInfo, type WikiSeasonData } from "./merge";
import { ApiFootball, QuotaExhausted, type ApiResult } from "./sources/api-football";
import { seasonPage, sectionWikitext } from "./sources/wikipedia";
import {
  coachStints,
  injurySpells,
  moves as toMoves,
  playerSeasons,
  results as toResults,
  wonTrophies,
  type ApiCoach,
  type ApiFixture,
  type ApiInjury,
  type ApiPlayerEntry,
  type ApiStandingRow,
  type ApiTransferPlayer,
  type ApiTrophy,
} from "./transform/api-football";
import { parseInfobox, parseSquadStats } from "./transform/wikipedia";

const FILES: Record<keyof Dataset, string> = {
  meta: "meta.json",
  playerSeasons: "player-seasons.json",
  transfers: "transfers.json",
  injuries: "injuries.json",
  profiles: "profiles.json",
  transferDetails: "transfer-details.json",
  seasonContext: "season-context.json",
  managers: "managers.json",
  presidents: "presidents.json",
  notes: "notes.json",
};

const log: string[] = [];
const say = (s: string) => {
  log.push(s);
  console.log(s);
};

const today = new Date().toISOString().slice(0, 10);
const HOUR = 1;
const DAY = 24 * HOUR;
const fresh = (fetchedAt: string, maxAgeHours: number) =>
  maxAgeHours === Infinity || Date.now() - Date.parse(fetchedAt) < maxAgeHours * 3600_000;

// --- API-Football through the cache ------------------------------------------
const key = process.env.API_FOOTBALL_KEY;
const api = key ? new ApiFootball(key) : null;
let apiStopped = !api;

/**
 * Cached API call. Fresh cache wins; otherwise fetch, store on success, and
 * fall back to stale cache on failure. Plan refusals are remembered for a week
 * so daily runs don't spend requests asking again.
 */
async function apiCached<T>(
  ns: string,
  cacheKey: string,
  maxAgeHours: number,
  call: (a: ApiFootball) => Promise<ApiResult<T>>,
): Promise<T | null> {
  const hit = await readCache<T>(ns, cacheKey);
  if (hit && fresh(hit.fetchedAt, maxAgeHours)) return hit.data;
  const blocked = await readCache<{ message: string }>("plan-blocked", `${ns}-${cacheKey}`);
  if (blocked && fresh(blocked.fetchedAt, 7 * DAY)) return hit?.data ?? null;
  if (apiStopped || !api) return hit?.data ?? null;
  try {
    const r = await call(api);
    if (r.ok) {
      await writeCache(ns, cacheKey, r.response);
      return r.response;
    }
    if (r.kind === "plan") {
      await writeCache("plan-blocked", `${ns}-${cacheKey}`, { message: r.message });
      say(`- API plan does not cover ${ns} ${cacheKey}: ${r.message}`);
    } else {
      say(`- API ${r.kind} for ${ns} ${cacheKey}: ${r.message}${hit ? " (using cache)" : ""}`);
      if (r.kind === "quota") apiStopped = true;
    }
  } catch (err) {
    if (!(err instanceof QuotaExhausted)) throw err;
    say(`- ${err.message}; the rest comes from cache`);
    apiStopped = true;
  }
  return hit?.data ?? null;
}

/** Finished seasons never change; the live one is refreshed twice a day. */
const seasonMaxAge = (s: string) => (today > `${startYear(s) + 1}-07-31` ? Infinity : 12 * HOUR);

async function apiSeason(s: string): Promise<ApiSeasonData | null> {
  const y = startYear(s);
  const age = seasonMaxAge(s);
  const players = await apiCached<ApiPlayerEntry[]>("players", String(y), age, (a) =>
    a.getAll("/players", { team: TEAM_ID, season: y }),
  );
  if (!players) return null;
  const fixtures = (await apiCached<ApiFixture[]>("fixtures", String(y), age, (a) => a.get("/fixtures", { team: TEAM_ID, season: y }))) ?? [];
  const injuries = (await apiCached<ApiInjury[]>("injuries", String(y), age, (a) => a.get("/injuries", { team: TEAM_ID, season: y }))) ?? [];
  const standings = await apiCached<{ league: { standings: ApiStandingRow[][] } }[]>("standings", String(y), age, (a) =>
    a.get("/standings", { league: LEAGUE_ID, season: y }),
  );
  const standing = standings?.[0]?.league.standings.flat().find((r) => r.team.id === TEAM_ID) ?? null;
  return { season: s, players: playerSeasons(players), injuries: injurySpells(injuries), results: toResults(fixtures), standing };
}

// --- Wikipedia through the cache ---------------------------------------------
let wikiDown = false;

async function wikiSeason(s: string): Promise<WikiSeasonData | null> {
  const y = startYear(s);
  const metaHit = await readCache<Awaited<ReturnType<typeof seasonPage>>>("wiki-page", String(y));
  let page = metaHit?.data ?? null;
  // Revision ids are rechecked daily; section text is cached per revision.
  if (!wikiDown && (!metaHit || !fresh(metaHit.fetchedAt, DAY))) {
    try {
      page = await seasonPage(y);
      await writeCache("wiki-page", String(y), page);
    } catch (err) {
      say(`- Wikipedia unreachable (${(err as Error).message}); using cache`);
      wikiDown = true;
    }
  }
  if (!page) return null;
  const section = async (index: string) => {
    const k = `${y}-r${page!.revid}-s${index}`;
    const hit = await readCache<string>("wiki-text", k);
    if (hit) return hit.data;
    if (wikiDown) return null;
    try {
      const text = await sectionWikitext(page!.title, index);
      await writeCache("wiki-text", k, text);
      return text;
    } catch (err) {
      say(`- Wikipedia section ${index} of ${page!.title} failed: ${(err as Error).message}`);
      return null;
    }
  };
  const stats =
    page.sections.find((x) => /appearances|squad statistics|playing statistics/i.test(x.line)) ??
    page.sections.find((x) => /statistics/i.test(x.line));
  const statsText = stats ? await section(stats.index) : null;
  const infoText = await section("0");
  const squad = statsText ? parseSquadStats(statsText) : null;
  return {
    season: s,
    title: page.title,
    revid: page.revid,
    squad: squad && squad.players.length ? squad : null,
    infobox: infoText ? parseInfobox(infoText) : null,
  };
}

// --- Main ----------------------------------------------------------------------
async function main() {
  const placeholderRaw = Object.fromEntries(
    await Promise.all(
      Object.entries(FILES).map(async ([k, f]) => [k, JSON.parse(await readFile(path.join(PATHS.placeholder, f), "utf8"))]),
    ),
  );
  const placeholder = datasetSchema.parse(placeholderRaw);
  const manual = await loadManual();

  const first = startYear(placeholder.meta.coverageTarget.firstSeason);
  const last = startYear(seasonOfDate(today));
  const target = Array.from({ length: last - first + 1 }, (_, i) => seasonOfYear(first + i));
  say(`Seasons ${target[0]} to ${target.at(-1)}; API key ${key ? "set" : "not set (cache only)"}`);

  // Cheap, high-value calls first so a short quota still gets them.
  const transferPlayers = await apiCached<ApiTransferPlayer[]>("transfers", "all", DAY, (a) => a.get("/transfers", { team: TEAM_ID }));
  const apiCoaches = (await apiCached<ApiCoach[]>("coachs", "all", 7 * DAY, (a) => a.get("/coachs", { team: TEAM_ID }))) ?? [];

  const apiData = new Map<string, ApiSeasonData>();
  for (const s of [...target].reverse()) {
    const d = await apiSeason(s);
    if (d) apiData.set(s, d);
  }

  const stints = coachStints(apiCoaches);
  const coaches: CoachInfo[] = [];
  for (const c of apiCoaches.filter((c) => stints.some((st) => st.apiId === c.id))) {
    const trophies = (await apiCached<ApiTrophy[]>("trophies", String(c.id), 7 * DAY, (a) => a.get("/trophies", { coach: c.id }))) ?? [];
    coaches.push({
      apiId: c.id,
      name: c.name,
      stints: stints.filter((st) => st.apiId === c.id).map(({ start, end }) => ({ start, end })),
      titles: wonTrophies(trophies).filter((t) => target.includes(t.season)),
    });
  }

  // Formations need one request per match; spend what is left of today's quota,
  // newest matches first, and keep them forever.
  const formations = new Map<number, string>();
  const fixtures = [...apiData.values()].flatMap((d) => d.results).sort((a, b) => b.date.localeCompare(a.date));
  for (const f of fixtures) {
    const hit = await readCache<{ team: { id: number }; formation: string | null }[]>("lineups", String(f.fixtureId));
    const fromCache = hit?.data;
    const lineups =
      fromCache ??
      (api && !apiStopped && (api.remaining == null || api.remaining > QUOTA_RESERVE + 5)
        ? await apiCached<{ team: { id: number }; formation: string | null }[]>("lineups", String(f.fixtureId), Infinity, (a) =>
            a.get("/fixtures/lineups", { fixture: f.fixtureId }),
          )
        : null);
    const mine = lineups?.find((l) => l.team.id === TEAM_ID)?.formation;
    if (mine) formations.set(f.fixtureId, mine);
  }

  const wiki = new Map<string, WikiSeasonData>();
  for (const s of target) {
    const w = await wikiSeason(s);
    if (w) wiki.set(s, w);
  }

  const { dataset, report } = merge({
    asOf: today,
    target,
    api: apiData,
    moves: transferPlayers ? toMoves(transferPlayers) : null,
    coaches,
    formations,
    wiki,
    manual,
    placeholder,
  });

  // Same validation the site runs at build time; a bad merge never ships.
  parseDataset(dataset, "pipeline merge");

  await mkdir(PATHS.snapshot, { recursive: true });
  for (const [k, f] of Object.entries(FILES)) {
    await writeFile(path.join(PATHS.snapshot, f), JSON.stringify(dataset[k as keyof Dataset], null, 1) + "\n");
  }

  const lines = [
    "## Benfica data refresh",
    "",
    `As of ${today}. API requests this run: ${api?.calls ?? 0}${api?.remaining != null ? `, ${api.remaining} left today` : ""}.`,
    "",
    "| Season | Source |",
    "| --- | --- |",
    ...target.map((s) => `| ${s} | ${report.seasons[s] ?? "none"} |`),
    "",
    `Rows: ${Object.entries(report.counts).map(([k, v]) => `${k} ${v}`).join(", ")}. Formations known for ${formations.size} of ${fixtures.length} matches.`,
    "",
    ...(report.warnings.length ? ["### Warnings", "", ...report.warnings.map((w) => `- ${w}`), ""] : []),
    ...(log.length > 1 ? ["### Log", "", ...log.slice(1), ""] : []),
  ];
  await writeFile(path.join(PATHS.snapshot, "REPORT.md"), lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  console.log("\n" + lines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
