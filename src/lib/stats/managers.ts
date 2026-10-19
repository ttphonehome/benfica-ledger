import type { Dataset, Manager, ManagerSeason, PlayerSeason, Position } from "@/data/schema";
import { monthsBetween } from "../dates";

export interface Record3 {
  w: number;
  d: number;
  l: number;
}

export const matchesOf = (r: Record3) => r.w + r.d + r.l;
export const pointsOf = (r: Record3) => r.w * 3 + r.d;
export const winPct = (r: Record3) => (matchesOf(r) ? (r.w / matchesOf(r)) * 100 : 0);
export const ppg = (r: Record3) => (matchesOf(r) ? pointsOf(r) / matchesOf(r) : 0);

export const seasonRecord = (s: Pick<ManagerSeason, "wins" | "draws" | "losses">): Record3 => ({
  w: s.wins,
  d: s.draws,
  l: s.losses,
});

export function sumRecords(rs: Record3[]): Record3 {
  return rs.reduce((a, r) => ({ w: a.w + r.w, d: a.d + r.d, l: a.l + r.l }), { w: 0, d: 0, l: 0 });
}

export interface ManagerAgg extends Record3 {
  id: string;
  name: string;
  nick: string;
  current: boolean;
  matches: number;
  winPct: number;
  ppg: number;
  titles: string[];
  avgFinish: number | null;
  avgAcademy: number;
  youthPromoted: string[];
  seasonCount: number;
  tenureMonths: number;
}

export function managerAgg(m: Manager, asOf: string): ManagerAgg {
  const rec = sumRecords(m.seasons.map(seasonRecord));
  const finishes = m.seasons.flatMap((s) => (s.finish == null ? [] : [s.finish]));
  return {
    id: m.id,
    name: m.name,
    nick: m.nick,
    current: m.departed == null,
    ...rec,
    matches: matchesOf(rec),
    winPct: winPct(rec),
    ppg: ppg(rec),
    titles: m.seasons.flatMap((s) => s.titles),
    avgFinish: finishes.length ? finishes.reduce((a, x) => a + x, 0) / finishes.length : null,
    avgAcademy: m.seasons.length ? m.seasons.reduce((a, s) => a + s.academyMinutesPct, 0) / m.seasons.length : 0,
    youthPromoted: [...new Set(m.seasons.flatMap((s) => s.youthPromoted))],
    seasonCount: m.seasons.length,
    tenureMonths: monthsBetween(m.appointed, m.departed ?? asOf),
  };
}

/** Seasons newest first. */
export const seasonsNewest = (m: Manager) => [...m.seasons].sort((a, b) => b.season.localeCompare(a.season));

export interface FormationAgg extends Record3 {
  name: string;
  matches: number;
  gf: number;
  ga: number;
  winPct: number;
  sharePct: number;
}

/** Formation records summed across seasons, most used first. */
export function formationAgg(seasons: ManagerSeason[]): FormationAgg[] {
  const map = new Map<string, Omit<FormationAgg, "winPct" | "sharePct">>();
  for (const s of seasons)
    for (const f of s.formations) {
      const a = map.get(f.name) ?? { name: f.name, matches: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      map.set(f.name, { ...a, matches: a.matches + f.matches, w: a.w + f.w, d: a.d + f.d, l: a.l + f.l, gf: a.gf + f.gf, ga: a.ga + f.ga });
    }
  const total = [...map.values()].reduce((a, f) => a + f.matches, 0);
  return [...map.values()]
    .map((f) => ({ ...f, winPct: f.matches ? (f.w / f.matches) * 100 : 0, sharePct: total ? (f.matches / total) * 100 : 0 }))
    .sort((a, b) => b.matches - a.matches);
}

export function tacticsVerdict(formations: FormationAgg[]): string | null {
  const top = formations[0];
  if (!top) return null;
  const pct = top.sharePct.toFixed(0);
  if (top.sharePct >= 70) return `Tactically rigid. The ${top.name} carried ${pct}% of his matches.`;
  if (top.sharePct >= 50) return `A clear primary system (${top.name}, ${pct}%) with measured rotation into alternatives.`;
  return `Flexible. No single formation dominated; the most used (${top.name}) covered just ${pct}%.`;
}

export function formationVerdict(byWinRate: FormationAgg[]): string | null {
  if (byWinRate.length < 2) return null;
  const best = byWinRate[0], worst = byWinRate[byWinRate.length - 1];
  const gap = best.winPct - worst.winPct;
  if (gap >= 15 && worst.matches >= 4)
    return `${best.name} wins ${best.winPct.toFixed(0)}% of the time. ${worst.name} only ${worst.winPct.toFixed(0)}%. Why keep using the second?`;
  if (gap >= 8) return `Marginal gap. ${best.name} is the better system but the alternatives aren't disasters.`;
  return "Formations produce similar results. Personnel matters more than shape here.";
}

export interface TrustedPlayer {
  playerId: string;
  player: string;
  pos: Position;
  apps: number;
  mins: number;
  /** Mean of the seasons that have a rating; null when none do. */
  rating: number | null;
}

// Players from the manager's seasons. Seasons shared with another manager
// (mid-season changes) count in full for both, as player rows aren't split.
export function playerTrust(d: Pick<Dataset, "playerSeasons">, m: Manager) {
  const seasons = new Set(m.seasons.map((s) => s.season));
  const by = new Map<string, PlayerSeason[]>();
  for (const p of d.playerSeasons) if (seasons.has(p.season)) by.set(p.playerId, [...(by.get(p.playerId) ?? []), p]);
  const all: TrustedPlayer[] = [...by.values()].map((rows) => {
    const rated = rows.flatMap((r) => (r.rating == null ? [] : [r.rating]));
    const latest = [...rows].sort((a, b) => b.season.localeCompare(a.season))[0];
    return {
      playerId: latest.playerId,
      player: latest.player,
      pos: latest.pos,
      apps: rows.reduce((a, r) => a + r.apps, 0),
      mins: rows.reduce((a, r) => a + r.mins, 0),
      rating: rated.length ? rated.reduce((a, x) => a + x, 0) / rated.length : null,
    };
  });
  return {
    hasPlayerData: all.length > 0,
    xi: [...all].sort((a, b) => b.apps - a.apps).slice(0, 11),
    frozen: all.filter((p) => p.apps < 10 && p.mins > 0).sort((a, b) => a.apps - b.apps).slice(0, 6),
  };
}
