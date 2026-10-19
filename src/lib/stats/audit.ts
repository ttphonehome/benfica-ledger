import type { Dataset, Season, Transfer } from "@/data/schema";

export type Verdict = "good" | "neutral" | "bad";

export interface AuditRow extends Transfer {
  rating: number | null;
  apps: number | null;
  mins: number | null;
  weeksInjured: number;
  /** Season the on-pitch numbers come from (may differ for departures). */
  statsSeason: Season | null;
  verdict: Verdict;
}

// Departures: the player's latest season up to the window (a summer sale
// leaves no row in the window season itself, so the previous season is the
// relevant record). Arrivals: their season at the club after arriving.
function statsFor(d: Pick<Dataset, "playerSeasons">, t: Transfer) {
  const rows = d.playerSeasons.filter((p) => p.playerId === t.playerId);
  if (t.dir === "in") return rows.find((p) => p.season === t.season) ?? null;
  return rows.filter((p) => p.season <= t.season).sort((a, b) => b.season.localeCompare(a.season))[0] ?? null;
}

// Editorial heuristics carried over from the design. They only fire when a
// rating exists; without ratings every move is neutral.
export function judgeOut(r: { rating: number | null; fee: number | null }): Verdict {
  if (r.rating == null || r.fee == null) return "neutral";
  const fee = r.fee;
  if (r.rating >= 7.3 && fee < 15) return "bad";
  if (r.rating >= 7.0) return "good";
  if (r.rating < 6.5 && fee > 8) return "good";
  return "neutral";
}

export function judgeIn(r: { rating: number | null; fee: number | null; type: Transfer["type"] }): Verdict {
  if (r.rating == null) return "neutral";
  if (r.type !== "permanent") return r.rating >= 7.3 ? "good" : "neutral";
  if (r.fee == null) return "neutral";
  if (!r.fee) return r.rating >= 7.3 ? "good" : "neutral";
  if (r.rating >= 7.3) return "good";
  if (r.rating < 6.6 && r.fee >= 10) return "bad";
  return "neutral";
}

export function auditRows(d: Pick<Dataset, "playerSeasons" | "transfers" | "injuries">, season: Season) {
  const enrich = (t: Transfer): AuditRow => {
    const s = statsFor(d, t);
    const base = {
      ...t,
      rating: s?.rating ?? null,
      apps: s?.apps ?? null,
      mins: s?.mins ?? null,
      statsSeason: s?.season ?? null,
      weeksInjured: s
        ? d.injuries.filter((i) => i.playerId === t.playerId && i.season === s.season).reduce((a, i) => a + i.weeks, 0)
        : 0,
    };
    return { ...base, verdict: t.dir === "in" ? judgeIn(base) : judgeOut(base) };
  };
  const rows = d.transfers.filter((t) => t.season === season).map(enrich);
  return { ins: rows.filter((r) => r.dir === "in"), outs: rows.filter((r) => r.dir === "out") };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : null);

export interface AuditSummary {
  soldCount: number;
  boughtCount: number;
  /** Exact permanent fees (€m). */
  totalOut: number;
  totalIn: number;
  undisclosedOut: number;
  undisclosedIn: number;
  avgOutRating: number | null;
  avgInRating: number | null;
  /** Only when both sides have ratings. */
  tradeVerdict: { tone: Verdict; text: string } | null;
}

export function auditSummary(ins: AuditRow[], outs: AuditRow[]): AuditSummary {
  const permIn = ins.filter((r) => r.type === "permanent");
  const permOut = outs.filter((r) => r.type === "permanent");
  const totalIn = permIn.reduce((a, r) => a + (r.fee ?? 0), 0);
  const totalOut = permOut.reduce((a, r) => a + (r.fee ?? 0), 0);
  const undisclosedIn = permIn.filter((r) => r.fee == null).length;
  const undisclosedOut = permOut.filter((r) => r.fee == null).length;
  const avgInRating = mean(ins.flatMap((r) => (r.rating == null ? [] : [r.rating])));
  const avgOutRating = mean(outs.flatMap((r) => (r.rating == null ? [] : [r.rating])));

  let tradeVerdict: AuditSummary["tradeVerdict"] = null;
  if (avgInRating != null && avgOutRating != null) {
    const diff = avgOutRating - avgInRating;
    const outflow = Math.round(totalIn) - Math.round(totalOut);
    if (diff > 0.4 && outflow > 0) tradeVerdict = { tone: "bad", text: "Bought weaker talent for more money. Bad trade." };
    else if (diff > 0.2 && outflow > 0)
      tradeVerdict = { tone: "bad", text: "Outflow rated higher than inflow, and the cheque flowed outward. Negative trade." };
    else if (diff > 0 && outflow <= 0) tradeVerdict = { tone: "neutral", text: "Lost a touch of quality but recouped the cash." };
    else if (diff < -0.2 && outflow < 0)
      tradeVerdict = { tone: "good", text: "Upgraded the squad and broke even or better. Strong window." };
    else if (diff < 0) tradeVerdict = { tone: "good", text: "Brought in higher-rated players than left. Quality up." };
    else tradeVerdict = { tone: "neutral", text: "Largely a sideways window." };
  }
  return { soldCount: permOut.length, boughtCount: permIn.length, totalOut, totalIn, undisclosedOut, undisclosedIn, avgOutRating, avgInRating, tradeVerdict };
}
