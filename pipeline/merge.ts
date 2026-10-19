import type {
  Dataset,
  Injury,
  Manager,
  ManagerSeason,
  PlayerSeason,
  PlayerStatus,
  Position,
  President,
  PresidentSeason,
  Transfer,
  TransferDetail,
} from "../src/data/schema";
import { slug, nameTokens } from "./lib/slug";
import { nationCode } from "./lib/nations";
import { seasonOfYear, startYear } from "./lib/seasons";
import type { Manual } from "./manual";
import type { ApiMove, ApiPlayerSeason, ApiStandingRow, InjurySpell, Result } from "./transform/api-football";
import type { WikiInfobox, WikiPlayerRow, WikiSeason } from "./transform/wikipedia";

// Combines the sources into one Dataset. Precedence, per season:
//   hand-kept overrides > API-Football > Wikipedia > design-handoff placeholder.
// Every fallback is reported, and per-season provenance is written to meta.

export interface ApiSeasonData {
  season: string;
  players: ApiPlayerSeason[];
  injuries: InjurySpell[];
  results: Result[];
  standing: ApiStandingRow | null;
}

export interface WikiSeasonData {
  season: string;
  title: string;
  revid: number;
  squad: WikiSeason | null;
  infobox: WikiInfobox | null;
}

export interface CoachInfo {
  apiId: number;
  name: string;
  stints: { start: string | null; end: string | null }[];
  titles: { season: string; competition: string }[];
}

export interface MergeInput {
  asOf: string;
  target: string[];
  api: Map<string, ApiSeasonData>;
  moves: ApiMove[] | null;
  coaches: CoachInfo[];
  formations: Map<number, string>;
  wiki: Map<string, WikiSeasonData>;
  manual: Manual;
  placeholder: Dataset;
}

export type SeasonSource = "api" | "wikipedia" | "placeholder";

export interface MergeReport {
  seasons: Record<string, SeasonSource | "none">;
  warnings: string[];
  counts: Record<string, number>;
}

const seasonStart = (s: string) => `${startYear(s)}-07-01`;
const seasonEnd = (s: string) => `${startYear(s) + 1}-06-30`;
const nextSeason = (s: string) => seasonOfYear(startYear(s) + 1);
const dayBefore = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) - 86400_000).toISOString().slice(0, 10);
const yearsAt = (birth: string, on: string) => {
  const b = new Date(birth), d = new Date(on);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) age--;
  return age;
};

/** Matches an API player to a Wikipedia row of the same season, to use Wikipedia's spelling. */
export function matchWikiName(p: ApiPlayerSeason, rows: WikiPlayerRow[]): WikiPlayerRow | null {
  const tokensOf = (w: WikiPlayerRow) => new Set([...nameTokens(w.name), ...nameTokens(w.display)]);
  const exact = rows.find((w) => slug(w.name) === slug(p.apiName) || slug(w.display) === slug(p.apiName));
  if (exact) return exact;
  const apiTokens = nameTokens(p.apiName.replace(/^[A-ZÀ-Ý]\.\s*/u, "")).filter((t) => t.length > 1);
  const subset = rows.filter((w) => apiTokens.length && apiTokens.every((t) => tokensOf(w).has(t)));
  if (subset.length === 1) return subset[0];
  const initial = slug(p.firstname ?? p.apiName)[0];
  const lastTokens = nameTokens(p.lastname ?? "").filter((t) => t.length > 2);
  const byLast = rows.filter((w) => lastTokens.some((t) => tokensOf(w).has(t)));
  if (byLast.length === 1) return byLast[0];
  const withInitial = (subset.length ? subset : byLast).filter((w) => slug(w.name)[0] === initial);
  return withInitial.length === 1 ? withInitial[0] : null;
}

function fallbackApiName(p: ApiPlayerSeason): string {
  if (!/^[A-ZÀ-Ý]\.\s/u.test(p.apiName)) return p.apiName;
  const first = (p.firstname ?? "").split(/\s+/)[0];
  return first ? `${first} ${p.apiName.replace(/^[A-ZÀ-Ý]\.\s*/u, "")}` : p.apiName;
}

export function merge(input: MergeInput): { dataset: Dataset; report: MergeReport } {
  const { manual, placeholder, asOf } = input;
  const warnings: string[] = [];
  const report: MergeReport = { seasons: {}, warnings, counts: {} };

  const alias = new Map(manual["player-aliases"].map((a) => [slug(a.alias), a.name]));
  const canon = (name: string) => alias.get(slug(name)) ?? name;
  const academy = new Set(manual.academy.map((a) => slug(canon(a.player))));
  const profiles = new Map(manual.profiles.map((p) => [slug(canon(p.player)), p]));

  // --- Names: API player ids -> the spelling used on the site ---------------
  const apiName = new Map<number, string>();
  const apiBirth = new Map<number, string>();
  for (const s of input.target) {
    const api = input.api.get(s);
    if (!api) continue;
    const wikiRows = input.wiki.get(s)?.squad?.players ?? [];
    for (const p of api.players) {
      const w = matchWikiName(p, wikiRows);
      apiName.set(p.apiId, canon(w ? w.name : fallbackApiName(p)));
      if (p.birthDate) apiBirth.set(p.apiId, p.birthDate);
    }
  }

  // --- Player seasons --------------------------------------------------------
  type Row = Omit<PlayerSeason, "status"> & { arrivedOnLoan?: boolean };
  const rows: Row[] = [];
  const sourceOf: Record<string, SeasonSource> = {};
  for (const s of input.target) {
    const api = input.api.get(s);
    const wiki = input.wiki.get(s);
    const seen = new Set<string>();
    const push = (r: Row) => {
      if (seen.has(r.playerId)) {
        warnings.push(`${s}: two source rows for ${r.player}; kept the first`);
        return;
      }
      seen.add(r.playerId);
      rows.push(r);
    };
    if (api && api.players.length) {
      sourceOf[s] = "api";
      const wikiRows = wiki?.squad?.players ?? [];
      for (const p of api.players) {
        const name = apiName.get(p.apiId)!;
        const id = slug(name);
        const w = matchWikiName(p, wikiRows);
        push({
          playerId: id,
          player: name,
          season: s,
          pos: profiles.get(id)?.primary ?? p.position ?? w?.pos ?? "MF",
          origin: academy.has(id) ? "academy" : "signed",
          nat: w?.nat ?? nationCode(p.nationality),
          apps: p.apps,
          mins: p.minutes,
          minsEstimated: false,
          goals: p.goals,
          assists: p.assists,
          rating: p.rating,
        });
      }
    } else if (wiki?.squad && wiki.squad.players.length) {
      sourceOf[s] = "wikipedia";
      for (const w of wiki.squad.players) {
        const apps = w.starts + w.subs;
        if (!apps) continue;
        const name = canon(w.name);
        const id = slug(name);
        push({
          playerId: id,
          player: name,
          season: s,
          pos: profiles.get(id)?.primary ?? w.pos ?? "MF",
          origin: academy.has(id) ? "academy" : "signed",
          nat: w.nat,
          apps,
          mins: w.starts * 85 + w.subs * 25,
          minsEstimated: true,
          goals: w.goals,
          assists: null,
          rating: null,
        });
      }
    } else {
      const fallback = placeholder.playerSeasons.filter((p) => p.season === s);
      if (fallback.length) {
        sourceOf[s] = "placeholder";
        warnings.push(`${s}: no API or Wikipedia squad data; kept the design-handoff placeholder rows`);
        for (const p of fallback) push({ ...p });
      }
    }
    report.seasons[s] = sourceOf[s] ?? "none";
  }

  // Hand-entered overrides (ratings, assists, minutes) with their sources.
  for (const o of manual.overrides) {
    if (o.kind === "fee") continue;
    const r = rows.find((x) => x.playerId === slug(canon(o.player)) && x.season === o.season);
    if (!r) {
      warnings.push(`Override for ${o.player} ${o.season} matches no player row`);
      continue;
    }
    if (o.kind === "rating") r.rating = o.value;
    if (o.kind === "assists") r.assists = Math.round(o.value);
    if (o.kind === "minutes") {
      r.mins = Math.round(o.value);
      r.minsEstimated = false;
    }
  }

  // --- Transfers -------------------------------------------------------------
  const inTarget = new Set(input.target);
  const posById = new Map<string, Position>();
  for (const r of rows) posById.set(r.playerId, r.pos);
  let transfers: Transfer[];
  const details: TransferDetail[] = [];
  if (input.moves) {
    transfers = input.moves
      .filter((m) => inTarget.has(m.season))
      .map((m) => {
        // Seasons without the API player list: take the spelling from the Wikipedia
        // squads around the move (arrivals play the window season, departures the one before).
        const near = [m.season, seasonOfYear(startYear(m.season) - 1), nextSeason(m.season)].flatMap(
          (x) => input.wiki.get(x)?.squad?.players ?? [],
        ).filter((r, i, all) => all.findIndex((o) => o.name === r.name) === i);
        const w = apiName.has(m.apiId)
          ? null
          : matchWikiName({ apiName: m.apiName, firstname: null, lastname: null } as ApiPlayerSeason, near);
        const name = apiName.get(m.apiId) ?? canon(w ? w.name : m.apiName);
        const id = slug(name);
        const birth = apiBirth.get(m.apiId);
        return {
          id: `${m.season}-${m.dir}-${id}-${m.type}-${m.date}`,
          playerId: id,
          player: name,
          season: m.season,
          dir: m.dir,
          date: m.date,
          type: m.type,
          fee: m.fee,
          club: m.club,
          pos: profiles.get(id)?.primary ?? posById.get(id) ?? null,
          age: birth ? yearsAt(birth, m.date) : null,
        };
      });
  } else {
    warnings.push("Transfers unavailable from the API; kept the design-handoff placeholder transfers");
    transfers = placeholder.transfers.filter((t) => inTarget.has(t.season));
  }
  for (const o of manual.overrides.filter((x) => x.kind === "fee")) {
    const t = transfers.find((x) => x.playerId === slug(canon(o.player)) && x.season === o.season && x.dir === o.dir);
    if (!t) {
      warnings.push(`Fee override for ${o.player} ${o.season} (${o.dir}) matches no transfer`);
      continue;
    }
    t.fee = o.value;
    t.type = "permanent";
    details.push({ transferId: t.id, baseFee: o.value, addOns: null, sellOnPct: null, contractUntil: null, sourceUrl: o.source_url });
  }

  // --- End-of-season status, from the moves around each season ---------------
  const movesBy = new Map<string, Transfer[]>();
  for (const t of transfers) movesBy.set(t.playerId, [...(movesBy.get(t.playerId) ?? []), t]);
  const statusFor = (r: Row): PlayerStatus => {
    const ms = (movesBy.get(r.playerId) ?? []).filter((t) => t.date ?? null);
    const y = startYear(r.season);
    const leaving = ms
      .filter(
        (t) =>
          t.dir === "out" &&
          ((t.season === r.season && t.date! >= `${y}-09-01`) || (t.season === nextSeason(r.season) && t.date! <= `${y + 1}-09-30`)),
      )
      .sort((a, b) => a.date!.localeCompare(b.date!))[0];
    if (leaving) {
      if (leaving.type === "permanent") return "sold";
      if (leaving.type === "loan-out") return "loan-out";
      if (leaving.type === "free") return "released";
      if (leaving.type === "loan-end") return "loan-in-ended";
    }
    const arrivedOnLoan = ms.some((t) => t.dir === "in" && t.type === "loan-in" && (t.season === r.season || t.season === seasonOfYear(y - 1)));
    const nextRow = rows.some((x) => x.playerId === r.playerId && x.season === nextSeason(r.season));
    const seasonOver = asOf > seasonEnd(r.season);
    if (arrivedOnLoan && seasonOver && !nextRow) return "loan-in-ended";
    return "stay";
  };
  const playerSeasons: PlayerSeason[] = rows.map(({ arrivedOnLoan: _a, ...r }) => {
    void _a;
    const fromPlaceholder = sourceOf[r.season] === "placeholder";
    const original = fromPlaceholder ? placeholder.playerSeasons.find((p) => p.playerId === r.playerId && p.season === r.season) : null;
    return { ...r, status: original?.status ?? statusFor(r) };
  });

  // --- Injuries ----------------------------------------------------------------
  const injuries: Injury[] = [];
  for (const s of input.target) {
    const api = input.api.get(s);
    if (!api) {
      injuries.push(...placeholder.injuries.filter((i) => i.season === s && sourceOf[s] === "placeholder"));
      continue;
    }
    for (const sp of api.injuries) {
      // Without the API player list, align the spelling with Wikipedia's squad.
      const w = apiName.has(sp.apiId)
        ? null
        : matchWikiName({ apiName: sp.apiName, firstname: null, lastname: null } as ApiPlayerSeason, input.wiki.get(s)?.squad?.players ?? []);
      const name = apiName.get(sp.apiId) ?? canon(w ? w.name : sp.apiName);
      const id = slug(name);
      injuries.push({
        id: `${s}-${id}-${sp.out}`,
        playerId: id,
        player: name,
        season: s,
        type: sp.reason,
        out: sp.out,
        back: null,
        weeks: sp.weeks,
        matches: sp.matches,
        notes: null,
      });
    }
  }

  // --- Managers ----------------------------------------------------------------
  const mgrList = [...manual.managers].sort((a, b) => a.appointed.localeCompare(b.appointed));
  for (let i = 0; i < mgrList.length; i++) {
    const m = mgrList[i];
    const next = mgrList[i + 1];
    if (!m.departed && next) {
      warnings.push(`managers.csv: ${m.name} has no departure date but ${next.name} was appointed ${next.appointed}; assumed ${dayBefore(next.appointed)}`);
      mgrList[i] = { ...m, departed: dayBefore(next.appointed) };
    }
  }
  const tenureEnd = (d: string | null) => d ?? asOf;
  const inCharge = (date: string) => mgrList.find((m) => m.appointed <= date && tenureEnd(m.departed) >= date);

  const coachFor = (name: string) =>
    input.coaches.find((c) => {
      const a = nameTokens(c.name.replace(/^[A-ZÀ-Ý]\.\s*/u, ""));
      const b = new Set(nameTokens(name));
      return a.length && a.every((t) => b.has(t));
    });
  for (const c of input.coaches) {
    const m = mgrList.find((x) => coachFor(x.name) === c);
    for (const st of c.stints) {
      if (!m) warnings.push(`API lists coach ${c.name} (${st.start ?? "?"} to ${st.end ?? "now"}); add them to data/manual/managers.csv`);
      else if (st.start && Math.abs(Date.parse(st.start) - Date.parse(m.appointed)) > 45 * 86400_000 && !mgrList.some((x) => x.name === m.name && Math.abs(Date.parse(st.start!) - Date.parse(x.appointed)) <= 45 * 86400_000)) {
        warnings.push(`API has ${c.name} starting ${st.start}; managers.csv has ${m.appointed} (check which is right)`);
      }
    }
  }

  // Wikipedia's infobox names every manager of a season; flag any missing from the CSV.
  for (const s of input.target) {
    for (const name of input.wiki.get(s)?.infobox?.managers ?? []) {
      const tokens = new Set(nameTokens(name));
      const known = mgrList.some((m) => {
        const t = nameTokens(m.name);
        return t.length > 0 && t.every((x) => tokens.has(x)) && m.appointed <= seasonEnd(s) && tenureEnd(m.departed) >= seasonStart(s);
      });
      if (!known) warnings.push(`Wikipedia lists ${name} as a ${s} manager; managers.csv has no tenure for them that season`);
    }
  }

  const titlesIn = (season: string) => {
    const fromApi = input.coaches.flatMap((c) => c.titles).filter((t) => t.season === season).map((t) => t.competition);
    const fromCsv = manual.titles.filter((t) => t.season === season).map((t) => t.competition);
    return [...new Set([...fromApi, ...fromCsv])];
  };

  const allSeasons = [...new Set([...placeholder.managers.flatMap((m) => m.seasons.map((s) => s.season)), ...input.target])].sort();
  const academyPct = (s: string) => {
    const r = playerSeasons.filter((p) => p.season === s);
    const total = r.reduce((a, p) => a + p.mins, 0);
    return total ? Math.round((r.filter((p) => p.origin === "academy").reduce((a, p) => a + p.mins, 0) / total) * 1000) / 10 : null;
  };

  const managers: Manager[] = mgrList.map((m) => {
    const seasons: ManagerSeason[] = [];
    for (const s of allSeasons) {
      const from = m.appointed > seasonStart(s) ? m.appointed : seasonStart(s);
      const to = tenureEnd(m.departed) < seasonEnd(s) ? tenureEnd(m.departed) : seasonEnd(s);
      if (from > to) continue;
      const note = manual["manager-notes"].find((n) => n.manager_id === m.id && n.season === s);
      const api = input.api.get(s);
      if (api && api.results.length) {
        const games = api.results.filter((r) => r.date >= from && r.date <= to);
        if (!games.length) continue;
        const w = games.filter((g) => g.result === "w").length;
        const d = games.filter((g) => g.result === "d").length;
        const league = games.filter((g) => g.leagueId === 94);
        const lastLeague = api.results.filter((r) => r.leagueId === 94).at(-1);
        const finishedSeason = !!lastLeague && lastLeague.date >= from && lastLeague.date <= to && asOf > seasonEnd(s);
        const forms = games.map((g) => input.formations.get(g.fixtureId));
        const formations = forms.every(Boolean)
          ? Object.values(
              games.reduce<Record<string, ManagerSeason["formations"][number]>>((acc, g, i) => {
                const f = (acc[forms[i]!] ??= { name: forms[i]!, matches: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
                f.matches++;
                f[g.result]++;
                f.gf += g.gf;
                f.ga += g.ga;
                return acc;
              }, {}),
            )
          : [];
        const atEnd = inCharge(lastLeague?.date ?? to)?.id === m.id;
        seasons.push({
          season: s,
          wins: w,
          draws: d,
          losses: games.length - w - d,
          gf: games.reduce((a, g) => a + g.gf, 0),
          ga: games.reduce((a, g) => a + g.ga, 0),
          finish: finishedSeason && api.standing ? api.standing.rank : null,
          leaguePoints: league.reduce((a, g) => a + (g.result === "w" ? 3 : g.result === "d" ? 1 : 0), 0),
          competitions: [...new Set(games.map((g) => g.league))],
          formations,
          academyMinutesPct: academyPct(s),
          youthPromoted: note?.youth_promoted ?? [],
          avgStartXIAge: null,
          notes: note?.notes ?? "",
          titles: atEnd && asOf > seasonEnd(s) ? titlesIn(s).map((t) => `${t} ${s}`) : [],
        });
      } else {
        const fb = placeholder.managers.find((x) => x.id === m.id)?.seasons.find((x) => x.season === s);
        if (fb) {
          seasons.push({ ...fb, notes: note?.notes ?? fb.notes, youthPromoted: note?.youth_promoted ?? fb.youthPromoted });
          if (input.target.includes(s)) warnings.push(`${m.name} ${s}: no match results available; kept the design-handoff record`);
        }
      }
    }
    return { id: m.id, name: m.name, nick: m.nick, appointed: m.appointed, departed: m.departed, seasons };
  });

  // --- Presidents --------------------------------------------------------------
  const knownManagers = new Set(managers.map((m) => m.id));
  const presidents: President[] = manual.presidents.map((p) => {
    const seasons: PresidentSeason[] = [];
    const pSeasons = [...new Set([...(placeholder.presidents.find((x) => x.id === p.id)?.seasons.map((s) => s.season) ?? []), ...input.target])].sort();
    for (const s of pSeasons) {
      const from = p.appointed > seasonStart(s) ? p.appointed : seasonStart(s);
      const to = tenureEnd(p.departed) < seasonEnd(s) ? tenureEnd(p.departed) : seasonEnd(s);
      if (from > to) continue;
      const note = manual["president-notes"].find((n) => n.president_id === p.id && n.season === s)?.notes;
      const api = input.api.get(s);
      if (api && api.results.length) {
        const games = api.results.filter((r) => r.date >= from && r.date <= to);
        if (!games.length) continue;
        const w = games.filter((g) => g.result === "w").length;
        const d = games.filter((g) => g.result === "d").length;
        const lastLeague = api.results.filter((r) => r.leagueId === 94).at(-1);
        const inOfficeAtEnd = !!lastLeague && lastLeague.date >= from && lastLeague.date <= to && asOf > seasonEnd(s);
        const names = [...new Set(games.map((g) => inCharge(g.date)?.name).filter(Boolean))];
        seasons.push({
          season: s,
          manager: names.join(" → ") || "—",
          wins: w,
          draws: d,
          losses: games.length - w - d,
          finish: inOfficeAtEnd && api.standing ? api.standing.rank : null,
          leaguePoints: games.filter((g) => g.leagueId === 94).reduce((a, g) => a + (g.result === "w" ? 3 : g.result === "d" ? 1 : 0), 0),
          titles: inOfficeAtEnd ? titlesIn(s) : [],
          notes: note ?? "",
        });
      } else {
        const fb = placeholder.presidents.find((x) => x.id === p.id)?.seasons.find((x) => x.season === s);
        if (fb) {
          seasons.push({ ...fb, notes: note ?? fb.notes });
          if (input.target.includes(s)) warnings.push(`President ${p.nick} ${s}: no match results available; kept the design-handoff record`);
        }
      }
    }
    const managersHired = manual["manager-hires"]
      .filter((h) => h.president_id === p.id)
      .filter((h) => {
        if (knownManagers.has(h.manager_id)) return true;
        warnings.push(`manager-hires.csv: unknown manager id ${h.manager_id}`);
        return false;
      })
      .map((h) => ({ managerId: h.manager_id, verdict: h.verdict, note: h.note }));
    // Verdicts are editorial, so a missing one is reported rather than filled in.
    for (const m of mgrList) {
      const inOffice = m.appointed >= p.appointed && (!p.departed || m.appointed < p.departed);
      if (inOffice && !managersHired.some((h) => h.managerId === m.id)) {
        warnings.push(`manager-hires.csv: no verdict for ${p.name} hiring ${m.name} (${m.id}, ${m.appointed}); not shown on the Presidency screen`);
      }
    }
    return { id: p.id, name: p.name, nick: p.nick, appointed: p.appointed, departed: p.departed, notes: p.notes, seasons, managersHired };
  });

  // --- Season context ------------------------------------------------------------
  const seasonContext: Dataset["seasonContext"] = [];
  for (const s of input.target) {
    const api = input.api.get(s);
    const wiki = input.wiki.get(s);
    const managersIn = mgrList.filter((m) => m.appointed <= seasonEnd(s) && tenureEnd(m.departed) >= seasonStart(s)).map((m) => m.name);
    if (api && api.standing) {
      seasonContext.push({
        season: s,
        leaguePosition: api.standing.rank,
        leagueNote: null,
        points: api.standing.points,
        manager: managersIn.join(" → ") || "—",
        goalsFor: api.standing.all.goals.for,
        goalsAgainst: api.standing.all.goals.against,
        competitions: [...new Set(api.results.map((r) => r.league))].join(" · "),
      });
    } else if (wiki && (wiki.infobox || wiki.squad)) {
      seasonContext.push({
        season: s,
        leaguePosition: wiki.infobox?.leaguePosition ?? null,
        leagueNote: null,
        points: null,
        manager: (wiki.infobox?.managers.length ? wiki.infobox.managers : managersIn).join(" → ") || "—",
        goalsFor: null,
        goalsAgainst: null,
        competitions: (wiki.squad?.competitions ?? []).join(" · "),
      });
    } else {
      const fb = placeholder.seasonContext.find((c) => c.season === s);
      if (fb) seasonContext.push(fb);
    }
  }

  // --- Meta --------------------------------------------------------------------------
  const seasonsMeta: Dataset["meta"]["seasons"] = {};
  for (const s of input.target) {
    const src = sourceOf[s];
    if (!src) continue;
    seasonsMeta[s] =
      src === "api"
        ? { status: "sourced", note: "API-Football: appearances, minutes, goals, assists, ratings, injuries and results." }
        : src === "wikipedia"
          ? { status: "partial", note: "Wikipedia: appearances and goals. Minutes estimated; no ratings or assists." }
          : placeholder.meta.seasons[s] ?? { status: "placeholder", note: "Design-handoff placeholder." };
  }
  const allVerified = <T extends { verified: boolean }>(xs: T[]) => xs.length > 0 && xs.every((x) => x.verified);
  const anyFallback = (xs: { seasons: { season: string }[] }[]) =>
    xs.some((x) => x.seasons.some((s) => !input.api.get(s.season)?.results.length));
  const placeholderSeasons = Object.values(sourceOf).includes("placeholder");

  const dataset: Dataset = {
    meta: {
      generatedAt: new Date().toISOString(),
      asOf,
      coverageTarget: placeholder.meta.coverageTarget,
      datasets: {
        playerSeasons: placeholderSeasons ? "unverified" : "sourced",
        transfers: input.moves ? "sourced" : "illustrative",
        injuries: "sourced",
        profiles: allVerified(manual.profiles) ? "sourced" : "unverified",
        transferDetails: "sourced",
        seasonContext: "sourced",
        managers: allVerified(manual.managers) && !anyFallback(managers) ? "sourced" : "unverified",
        presidents: allVerified(manual.presidents) && !anyFallback(presidents) ? "sourced" : "unverified",
        notes: "unverified",
      },
      seasons: seasonsMeta,
    },
    playerSeasons,
    transfers,
    injuries,
    profiles: manual.profiles.map((p) => ({
      playerId: slug(canon(p.player)),
      player: canon(p.player),
      primary: p.primary,
      secondary: p.secondary,
      foot: p.foot,
      role: p.role,
    })),
    transferDetails: details,
    seasonContext,
    managers,
    presidents,
    notes: manual.notes.map((n) => ({ playerId: slug(canon(n.player)), text: n.text })),
  };

  report.counts = {
    playerSeasons: playerSeasons.length,
    transfers: transfers.length,
    injuries: injuries.length,
    managers: managers.length,
    presidents: presidents.length,
    undisclosedFees: transfers.filter((t) => t.type === "permanent" && t.fee == null).length,
  };
  return { dataset, report };
}
