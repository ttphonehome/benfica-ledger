import type { Dataset, Manager, President, Season } from "@/data/schema";
import { yearsBetween } from "../dates";
import { managerAgg, matchesOf, ppg, sumRecords, winPct, type Record3 } from "./managers";
import { hasTransferData, seasonSpending } from "./spending";

// A season's transfers are credited to the president in office on 1 July of
// the season's first year, when the summer window opens. Seasons where they
// took over mid-way show no spend for them.
export function spendCreditedTo(p: President, season: Season): boolean {
  const start = `${season.slice(0, 4)}-07-01`;
  return p.appointed <= start && (p.departed == null || p.departed > start);
}

export interface PresidentSeasonRow {
  season: Season;
  manager: string;
  record: Record3;
  ppg: number;
  finish: number | null;
  titles: string[];
  notes: string;
  /** Whole €m; null when there is no transfer data or the spend isn't credited. */
  spent: number | null;
  received: number | null;
  net: number | null;
  bought: number | null;
  sold: number | null;
  spendNote: "ok" | "no-data" | "not-in-office";
}

export function presidentSeasons(d: Pick<Dataset, "transfers">, p: President): PresidentSeasonRow[] {
  return [...p.seasons]
    .sort((a, b) => a.season.localeCompare(b.season))
    .map((s) => {
      const record = { w: s.wins, d: s.draws, l: s.losses };
      const credited = spendCreditedTo(p, s.season);
      const known = hasTransferData(d.transfers, s.season);
      const sp = credited && known ? seasonSpending(d.transfers, s.season) : null;
      return {
        season: s.season,
        manager: s.manager,
        record,
        ppg: ppg(record),
        finish: s.finish,
        titles: s.titles,
        notes: s.notes,
        spent: sp ? Math.round(sp.spent) : null,
        received: sp ? Math.round(sp.received) : null,
        net: sp ? sp.net : null,
        bought: sp ? sp.bought : null,
        sold: sp ? sp.sold : null,
        spendNote: sp ? "ok" : !credited ? "not-in-office" : "no-data",
      };
    });
}

const isLeague = (t: string) => /^Primeira Liga/.test(t);

export interface ManagerHireRow {
  managerId: string;
  name: string;
  appointed: string;
  departed: string | null;
  years: number;
  record: Record3;
  winPct: number;
  titles: string[];
  verdict: "good" | "neutral" | "bad";
  note: string;
}

export interface PresidentAgg extends Record3 {
  id: string;
  name: string;
  nick: string;
  current: boolean;
  tenureYears: number;
  seasonCount: number;
  matches: number;
  winPct: number;
  ppg: number;
  titles: number;
  leagueTitles: number;
  otherTitles: number;
  /** Titles per season in the window (not per year of the whole tenure). */
  titlesPerSeason: number;
  /** Sum over seasons with credited spend data; null when there are none. */
  netSpend: number | null;
  spendSeasons: number;
  avgNetPerSeason: number | null;
  avgFinish: number | null;
  hires: ManagerHireRow[];
  avgHireYears: number;
}

export function presidentAgg(d: Pick<Dataset, "transfers">, p: President, managers: Manager[], asOf: string): PresidentAgg {
  const rows = presidentSeasons(d, p);
  const rec = sumRecords(rows.map((r) => r.record));
  const titles = rows.flatMap((r) => r.titles);
  const leagueTitles = titles.filter(isLeague).length;
  const withSpend = rows.filter((r) => r.net != null);
  const netSpend = withSpend.length ? withSpend.reduce((a, r) => a + r.net!, 0) : null;
  const finishes = rows.flatMap((r) => (r.finish == null ? [] : [r.finish]));
  const hires: ManagerHireRow[] = p.managersHired.map((h) => {
    const m = managers.find((x) => x.id === h.managerId)!;
    const agg = managerAgg(m, asOf);
    const record = { w: agg.w, d: agg.d, l: agg.l };
    return {
      managerId: m.id,
      name: m.nick,
      appointed: m.appointed,
      departed: m.departed,
      years: yearsBetween(m.appointed, m.departed ?? asOf),
      record,
      winPct: winPct(record),
      titles: agg.titles,
      verdict: h.verdict,
      note: h.note,
    };
  });
  return {
    id: p.id,
    name: p.name,
    nick: p.nick,
    current: p.departed == null,
    tenureYears: yearsBetween(p.appointed, p.departed ?? asOf),
    seasonCount: rows.length,
    ...rec,
    matches: matchesOf(rec),
    winPct: winPct(rec),
    ppg: ppg(rec),
    titles: titles.length,
    leagueTitles,
    otherTitles: titles.length - leagueTitles,
    titlesPerSeason: rows.length ? titles.length / rows.length : 0,
    netSpend,
    spendSeasons: withSpend.length,
    avgNetPerSeason: netSpend != null ? netSpend / withSpend.length : null,
    avgFinish: finishes.length ? finishes.reduce((a, x) => a + x, 0) / finishes.length : null,
    hires,
    avgHireYears: hires.length ? hires.reduce((a, h) => a + h.years, 0) / hires.length : 0,
  };
}
