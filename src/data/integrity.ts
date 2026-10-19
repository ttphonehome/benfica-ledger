import type { Dataset } from "./schema";

// Checks that span rows, which the per-row schemas can't see.
// Returns a list of problems; an empty list means the dataset is consistent.
export function integrityProblems(d: Dataset): string[] {
  const problems: string[] = [];
  const dupes = (label: string, keys: string[]) => {
    const seen = new Set<string>();
    for (const k of keys) {
      if (seen.has(k)) problems.push(`Duplicate ${label}: ${k}`);
      seen.add(k);
    }
  };

  dupes("player season", d.playerSeasons.map((p) => `${p.playerId}@${p.season}`));
  dupes("transfer id", d.transfers.map((t) => t.id));
  dupes("injury id", d.injuries.map((i) => i.id));
  dupes("profile", d.profiles.map((p) => p.playerId));
  dupes("season context", d.seasonContext.map((s) => s.season));
  dupes("manager id", d.managers.map((m) => m.id));
  dupes("president id", d.presidents.map((p) => p.id));

  const transferIds = new Set(d.transfers.map((t) => t.id));
  for (const td of d.transferDetails) {
    if (!transferIds.has(td.transferId)) problems.push(`Transfer detail for unknown transfer ${td.transferId}`);
  }
  const managerIds = new Set(d.managers.map((m) => m.id));
  for (const p of d.presidents) {
    for (const h of p.managersHired) {
      if (!managerIds.has(h.managerId)) problems.push(`President ${p.id} hired unknown manager ${h.managerId}`);
    }
  }
  const seasons = new Set(d.playerSeasons.map((p) => p.season));
  for (const s of seasons) {
    if (!(s in d.meta.seasons)) problems.push(`No provenance entry for season ${s}`);
  }
  for (const m of d.managers) {
    for (const s of m.seasons) {
      const played = s.wins + s.draws + s.losses;
      const inFormations = s.formations.reduce((a, f) => a + f.matches, 0);
      if (s.formations.length && inFormations !== played) {
        problems.push(`Manager ${m.id} ${s.season}: formations cover ${inFormations} matches, record has ${played}`);
      }
    }
  }
  return problems;
}
