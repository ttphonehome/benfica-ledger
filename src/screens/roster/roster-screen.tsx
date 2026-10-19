"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import type { PlayerProfile } from "@/data/schema";
import { DASH } from "@/i18n/format";
import { useI18n } from "@/i18n/client";
import type { DictKey } from "@/i18n/dictionaries/en";
import { positionGroup, type PositionGroup } from "@/lib/stats/positions";
import { defaultRosterSort, type PlayerHistory, type RosterRow } from "@/lib/stats/roster";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/data-table/scroll-area";
import { SortHead } from "@/components/data-table/sort-header";
import { localeText } from "@/components/data-table/sorting";
import { Faint, PosTag, RatingChip } from "@/components/common/cells";
import { PlayerCard } from "@/components/player/player-card";
import { parsePlayerHash } from "@/components/shell/player-hash-router";
import { cn } from "@/lib/utils";

const col = createColumnHelper<RosterRow>();

// Nullable numbers map to undefined so TanStack keeps them last in both
// directions, like the reference.
const columns = [
  col.accessor("player", { header: "col.player", sortingFn: localeText }),
  col.accessor("pos", { header: "col.pos", sortingFn: localeText }),
  col.accessor("origin", { header: "col.origin", sortingFn: localeText }),
  col.accessor((r) => r.nat ?? undefined, { id: "nat", header: "col.nat", sortingFn: localeText, sortUndefined: "last" }),
  col.accessor("apps", { header: "col.apps", meta: { right: true } }),
  col.accessor("mins", { header: "col.min", meta: { right: true } }),
  col.accessor("goals", { header: "col.goals", meta: { right: true } }),
  col.accessor((r) => r.assists ?? undefined, { id: "assists", header: "col.assists", sortUndefined: "last", meta: { right: true } }),
  col.accessor((r) => r.rating ?? undefined, { id: "rating", header: "col.rating", sortUndefined: "last", meta: { right: true } }),
  col.accessor("weeksInjured", { header: "col.wksOut", meta: { right: true } }),
  col.accessor("status", { header: "col.status", enableSorting: false }),
];

const STATUS: Record<RosterRow["status"], { label: DictKey; variant: "sold" | "loan" | "default" } | null> = {
  stay: null,
  sold: { label: "status.sold", variant: "sold" },
  "loan-out": { label: "status.loanOut", variant: "loan" },
  "loan-in-ended": { label: "status.loanEnded", variant: "loan" },
  released: { label: "status.released", variant: "default" },
};

type GroupFilter = "all" | PositionGroup;
type OriginFilter = "all" | RosterRow["origin"];

export function RosterScreen({
  season,
  rows,
  histories,
  profiles,
  notes,
}: {
  season: string;
  rows: RosterRow[];
  histories: Record<string, PlayerHistory>;
  profiles: Record<string, PlayerProfile>;
  notes: Record<string, string>;
}) {
  const { t, f } = useI18n();
  const [group, setGroup] = useState<GroupFilter>("all");
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [minApps, setMinApps] = useState(0);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>(() => [{ id: defaultRosterSort(rows), desc: true }]);

  // #player=<name or id> expands that player and scrolls to them.
  useEffect(() => {
    const open = () => {
      const key = parsePlayerHash(window.location.hash);
      const row = key ? rows.find((r) => r.player === key || r.playerId === key) : undefined;
      if (!row) return;
      setExpanded(row.playerId);
      requestAnimationFrame(() =>
        document.getElementById(`player-${season}-${row.playerId}`)?.scrollIntoView({ block: "center" }),
      );
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [rows, season]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (group === "all" || positionGroup(r.pos) === group) &&
        (origin === "all" || r.origin === origin) &&
        r.apps >= minApps &&
        (!q || r.player.toLowerCase().includes(q)),
    );
  }, [rows, group, origin, minApps, query]);

  // TanStack's table object isn't memoizable; React Compiler skips this component, which is fine here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.playerId,
    sortDescFirst: true,
    enableSortingRemoval: false,
    autoResetAll: false,
  });

  const sorted = table.getRowModel().rows;
  const colCount = columns.length;
  const maxApps = Math.max(35, ...rows.map((r) => r.apps));

  return (
    <div>
      <div className="kicker">{t("roster.kicker", { season })}</div>
      <h1 className="section-h">{t("roster.title")}</h1>
      <p className="dek">{t("roster.dek")}</p>

      <div className="mb-8 border border-border bg-background">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-paper-2 px-4 py-3.5">
          <span className="label-mono -mr-1">{t("roster.filter")}</span>
          <Select value={group} onValueChange={(v) => setGroup(v as GroupFilter)}>
            <SelectTrigger aria-label={t("roster.groupAria")} className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("roster.allPositions")}</SelectItem>
              <SelectItem value="GK">{t("roster.gk")}</SelectItem>
              <SelectItem value="DEF">{t("roster.def")}</SelectItem>
              <SelectItem value="MID">{t("roster.mid")}</SelectItem>
              <SelectItem value="ATT">{t("roster.att")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={origin} onValueChange={(v) => setOrigin(v as OriginFilter)}>
            <SelectTrigger aria-label={t("roster.originAria")} className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("roster.allOrigins")}</SelectItem>
              <SelectItem value="academy">{t("roster.academy")}</SelectItem>
              <SelectItem value="signed">{t("roster.signed")}</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 font-mono text-[11px] text-mute">
            <span id="min-apps-label">{t("roster.minApps")}</span>
            <Slider
              aria-labelledby="min-apps-label"
              aria-label={t("roster.minAppsAria")}
              min={0}
              max={maxApps}
              step={1}
              value={[minApps]}
              onValueChange={([v]) => setMinApps(v)}
              className="w-[100px] touch:w-[140px]"
            />
            <span className="min-w-[18px] text-foreground">{minApps}</span>
          </label>
          <Input
            type="search"
            aria-label={t("roster.searchAria")}
            placeholder={t("roster.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-sm:w-full"
          />
          <span className="ml-auto font-mono text-[11px] text-mute" aria-live="polite">
            {t("roster.count", { n: sorted.length, total: rows.length })}
          </span>
        </div>

        <ScrollArea>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <SortHead
                      key={h.id}
                      column={h.column}
                      label={t(h.column.columnDef.header as DictKey)}
                      right={(h.column.columnDef.meta as { right?: boolean } | undefined)?.right}
                    />
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {sorted.map(({ original: p }) => {
                const open = expanded === p.playerId;
                const status = STATUS[p.status];
                const toggle = () => setExpanded(open ? null : p.playerId);
                return (
                  <Fragment key={p.playerId}>
                    <TableRow
                      id={`player-${season}-${p.playerId}`}
                      data-player={p.playerId}
                      onClick={toggle}
                      className={cn("cursor-pointer hover:bg-paper-2", open && "bg-paper-2")}
                    >
                      <TableCell className="text-sm font-medium tracking-[-0.012em] max-sm:text-[13.5px]">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={`card-${season}-${p.playerId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle();
                          }}
                          className="-mx-1 inline-flex items-center px-1 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none touch:min-h-11"
                        >
                          {p.weeksInjured > 0 && (
                            <span
                              className="mr-1.5 inline-block size-[7px] rounded-full bg-bad"
                              title={t("injured", { n: p.weeksInjured })}
                              aria-label={t("injured", { n: p.weeksInjured })}
                            />
                          )}
                          {p.player}
                        </button>
                      </TableCell>
                      <TableCell>
                        <PosTag pos={p.pos} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.origin === "academy" ? "academy" : "default"}>{t(`origin.${p.origin}`)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[12.5px] text-mute">{p.nat ?? DASH}</TableCell>
                      <TableCell className="tnum text-right font-mono text-[12.5px]">{p.apps}</TableCell>
                      <TableCell className="tnum text-right font-mono text-[12.5px]">
                        {f.mins(p.mins)}
                      </TableCell>
                      <TableCell className="tnum text-right font-mono text-[12.5px]">{p.goals || ""}</TableCell>
                      <TableCell className="tnum text-right font-mono text-[12.5px]">
                        {p.assists == null ? <Faint /> : p.assists || ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <RatingChip r={p.rating} />
                      </TableCell>
                      <TableCell className="tnum text-right font-mono text-[12.5px]">
                        {p.weeksInjured ? <span className="text-bad">{p.weeksInjured}</span> : <Faint />}
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <Badge variant={status.variant}>{t(status.label)}</Badge>
                        ) : (
                          <span className="font-mono text-[11px] text-mute">{DASH}</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {open && histories[p.playerId] && (
                      <tr className="bg-paper-2">
                        <td colSpan={colCount} className="p-0">
                          <div
                            id={`card-${season}-${p.playerId}`}
                            data-card={p.playerId}
                            className="sticky left-0 animate-in fade-in-0 slide-in-from-top-1 duration-200 max-md:w-(--scroll-w)"
                          >
                            <PlayerCard
                              history={histories[p.playerId]}
                              profile={profiles[p.playerId]}
                              note={notes[p.playerId]}
                              currentSeason={season}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="p-10 text-center text-mute">
                    {t("roster.empty")}
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
