import type { Dataset, Season } from "@/data/schema";
import { seasonsNewestFirst } from "./seasons";

export type TabId = "overview" | "roster" | "transfers" | "spending" | "managers" | "presidents";

export const TABS: { id: TabId; label: string; path: string }[] = [
  { id: "overview", label: "Season Overview", path: "" },
  { id: "roster", label: "Roster", path: "roster" },
  { id: "transfers", label: "Transfer Audit", path: "transfers" },
  { id: "spending", label: "Spending Trends", path: "spending" },
  { id: "managers", label: "Manager Era", path: "managers" },
  { id: "presidents", label: "Presidency Era", path: "presidents" },
];

/** Badge counts on the nav tabs (Season Overview has none). */
export function tabCounts(d: Dataset, season: Season): Record<Exclude<TabId, "overview">, number> {
  return {
    roster: d.playerSeasons.filter((p) => p.season === season).length,
    transfers: d.transfers.filter((t) => t.season === season).length,
    spending: seasonsNewestFirst(d).length,
    managers: d.managers.length,
    presidents: d.presidents.length,
  };
}

export function tabHref(season: Season, tab: TabId): string {
  const t = TABS.find((x) => x.id === tab)!;
  return t.path ? `/${season}/${t.path}` : `/${season}`;
}
