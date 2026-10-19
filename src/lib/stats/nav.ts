import type { Dataset, Season } from "@/data/schema";
import type { DictKey } from "@/i18n/dictionaries/en";
import type { Lang } from "@/i18n/config";
import { seasonsNewestFirst } from "./seasons";

export type TabId = "overview" | "roster" | "transfers" | "spending" | "managers" | "presidents";

export const TABS: { id: TabId; label: DictKey; path: string }[] = [
  { id: "overview", label: "tab.overview", path: "" },
  { id: "roster", label: "tab.roster", path: "roster" },
  { id: "transfers", label: "tab.transfers", path: "transfers" },
  { id: "spending", label: "tab.spending", path: "spending" },
  { id: "managers", label: "tab.managers", path: "managers" },
  { id: "presidents", label: "tab.presidents", path: "presidents" },
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

export function tabHref(lang: Lang, season: Season, tab: TabId): string {
  const t = TABS.find((x) => x.id === tab)!;
  return t.path ? `/${lang}/${season}/${t.path}` : `/${lang}/${season}`;
}

/** The tab a pathname like /pt/2025-26/roster points at. */
export function tabFromPath(pathname: string): TabId {
  const seg = pathname.split("/")[3] ?? "";
  return TABS.find((t) => t.path === seg)?.id ?? "overview";
}
