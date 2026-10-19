"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs";
import type { ManagerSeason } from "@/data/schema";
import { DASH } from "@/i18n/format";
import { useI18n } from "@/i18n/client";
import type { DictKey } from "@/i18n/dictionaries/en";
import {
  formationVerdict,
  ppg,
  seasonRecord,
  tacticsVerdict,
  type FormationAgg,
  type ManagerAgg,
  type TrustedPlayer,
} from "@/lib/stats/managers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortHead } from "@/components/data-table/sort-header";
import { localeText } from "@/components/data-table/sorting";
import { ScrollArea } from "@/components/data-table/scroll-area";
import { Aside } from "@/components/common/panel";
import { Faint, PosTag, RatingChip } from "@/components/common/cells";
import { RecordBig, StatCard, StatCards, Suffix } from "@/components/common/stat-cards";
import { TenureTimeline } from "@/components/charts/tenure-timeline";
import { PpgTrend } from "@/components/charts/ppg-trend";
import { cn } from "@/lib/utils";

export interface ManagerView {
  agg: ManagerAgg;
  appointed: string;
  departed: string | null;
  seasons: ManagerSeason[]; // newest first
  formations: FormationAgg[];
  trust: { hasPlayerData: boolean; xi: TrustedPlayer[]; frozen: TrustedPlayer[] };
}

const col = createColumnHelper<ManagerAgg>();
const columns = [
  col.accessor("nick", { header: "col.manager", sortingFn: localeText }),
  col.accessor("seasonCount", { header: "col.seasons", meta: { right: true } }),
  col.accessor("matches", { header: "col.matches", meta: { right: true } }),
  col.accessor("w", { header: "col.record" }),
  col.accessor("winPct", { header: "col.winPct", meta: { right: true } }),
  col.accessor("ppg", { header: "col.ppg", meta: { right: true } }),
  col.accessor((r) => r.titles.length, { id: "titles", header: "col.titles", meta: { right: true } }),
  col.accessor((r) => r.avgFinish ?? undefined, { id: "avgFinish", header: "col.avgFinish", sortUndefined: "last", meta: { right: true } }),
  col.accessor((r) => r.avgAcademy ?? undefined, { id: "avgAcademy", header: "col.acadMins", sortUndefined: "last", meta: { right: true } }),
];

export function ManagersScreen({ managers, asOf }: { managers: ManagerView[]; asOf: string }) {
  const { t, tp, f } = useI18n();
  const [selected, setSelected] = useState(managers.find((m) => m.agg.current)?.agg.id ?? managers[0].agg.id);
  const [sorting, setSorting] = useState<SortingState>([{ id: "winPct", desc: true }]);
  const m = managers.find((x) => x.agg.id === selected)!;
  const a = m.agg;
  const earliest = [...managers].sort((x, y) => x.appointed.localeCompare(y.appointed))[0];

  // Stable data identity matters: a new array each render makes TanStack
  // auto-reset its state, which re-renders, which makes a new array, forever.
  const rows = useMemo(() => managers.map((x) => x.agg), [managers]);

  // TanStack's table object isn't memoizable; React Compiler skips this component, which is fine here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.id,
    sortDescFirst: true,
    enableSortingRemoval: false,
    autoResetAll: false,
  });

  const latest = m.seasons[0];
  const anchor = latest ? [...latest.formations].sort((x, y) => y.matches - x.matches)[0] : undefined;
  const anchorPct = anchor && latest ? (anchor.matches / Math.max(1, latest.formations.reduce((s, fm) => s + fm.matches, 0))) * 100 : null;
  const startYear = earliest.appointed.slice(0, 4);
  const num = "tnum text-right font-mono text-[12.5px]";

  return (
    <div>
      <div className="kicker">{t("managers.kicker", { year: startYear })}</div>
      <h1 className="section-h">{t("managers.title")}</h1>
      <p className="dek">{t("managers.dek", { name: earliest.agg.name, year: startYear })}</p>

      <TenureTimeline
        start={earliest.appointed}
        asOf={asOf}
        selected={selected}
        onSelect={setSelected}
        bars={managers.map((x) => ({
          id: x.agg.id,
          label: x.agg.nick,
          start: x.appointed,
          end: x.departed,
          titles: x.agg.titles.length,
          tooltip: t("managers.tooltip", { nick: x.agg.nick, n: x.agg.tenureMonths, t: x.agg.titles.length }),
        }))}
      />

      <div className="mt-7 mb-8 border border-border">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-paper-2 px-4 py-3.5">
          <span className="label-mono">{t("managers.all")}</span>
          <span className="font-mono text-[11px] text-mute">{t("managers.clickRow")}</span>
        </div>
        <ScrollArea>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <SortHead key={h.id} column={h.column} label={t(h.column.columnDef.header as DictKey)}
                      right={(h.column.columnDef.meta as { right?: boolean } | undefined)?.right} />
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map(({ original: r }) => (
                <TableRow key={r.id} onClick={() => setSelected(r.id)} className={cn("cursor-pointer hover:bg-paper-2", r.id === selected && "bg-paper-2")}>
                  <TableCell className="text-sm font-medium tracking-[-0.012em]">
                    <button
                      type="button"
                      aria-pressed={r.id === selected}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r.id);
                      }}
                      className="-mx-1 inline-flex items-center px-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none touch:min-h-11"
                    >
                      {r.current && <span className="mr-1.5 inline-block size-[7px] rounded-full bg-good" aria-label={t("current")} />}
                      {r.nick}
                    </button>
                  </TableCell>
                  <TableCell className={num}>{r.seasonCount}</TableCell>
                  <TableCell className={num}>{r.matches}</TableCell>
                  <TableCell className="font-mono text-[12.5px]">
                    {r.w}
                    <span className="text-mute">–{r.d}–</span>
                    <span className="text-bad">{r.l}</span>
                  </TableCell>
                  <TableCell className={cn(num, "font-medium")}>{f.pct(r.winPct)}</TableCell>
                  <TableCell className={num}>{f.num(r.ppg, 2)}</TableCell>
                  <TableCell className={num}>
                    {r.titles.length ? <span className="text-good" aria-label={`${r.titles.length} ${t("col.titles")}`}>{"★".repeat(r.titles.length)}</span> : <Faint />}
                  </TableCell>
                  <TableCell className={num}>{r.avgFinish != null ? f.num(r.avgFinish, 1) : <Faint />}</TableCell>
                  <TableCell className={num}>{r.avgAcademy == null ? <Faint /> : `${Math.round(r.avgAcademy)}%`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <section className="mt-10" aria-labelledby="focus-name">
        <div className="kicker">{t("focus.kicker", { nick: a.nick })}</div>
        <h2 id="focus-name" className="section-h mb-1">{a.name}</h2>
        <p className="dek mb-6">
          {t("managers.appointed", { date: f.month(m.appointed) })}
          {m.departed
            ? t("managers.departed", { date: f.month(m.departed), n: a.tenureMonths })
            : t("managers.still", { n: a.tenureMonths })}
          .
        </p>

        <StatCards cols={4}>
          <StatCard label={t("managers.record")} big={<RecordBig w={a.w} d={a.d} l={a.l} />} sub={t("managers.winLine", { pct: Math.round(a.winPct), ppg: f.num(a.ppg, 2) })} />
          <StatCard label={t("managers.titles")} big={<>{a.titles.length}<Suffix>{t("managers.won")}</Suffix></>} sub={a.titles.join(" · ") || t("managers.noTitles")} />
          <StatCard
            label={t("managers.youth")}
            big={a.avgAcademy == null ? DASH : <>{Math.round(a.avgAcademy)}<Suffix>{t("managers.acadMins")}</Suffix></>}
            sub={tp("managers.promoted", a.youthPromoted.length)}
          />
          <StatCard
            label={t("managers.anchor")}
            big={anchor?.name ?? DASH}
            bigClassName="text-[26px]"
            sub={anchor && latest ? t("managers.primaryIn", { pct: Math.round(anchorPct!), season: latest.season }) : t("managers.noFormation")}
          />
        </StatCards>

        <Tabs key={selected} defaultValue="seasons">
          <UnderlineTabsList>
            <UnderlineTabsTrigger value="seasons">{t("managers.tab.seasons")}</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="tactics">{t("managers.tab.tactics")}</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="formation">{t("managers.tab.formation")}</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="trust">{t("managers.tab.trust")}</UnderlineTabsTrigger>
          </UnderlineTabsList>
          <div className="min-h-[200px]">
            <TabsContent value="seasons"><SeasonBreakdown seasons={m.seasons} /></TabsContent>
            <TabsContent value="tactics"><Tactics name={a.name} formations={m.formations} /></TabsContent>
            <TabsContent value="formation"><FormationImpact formations={m.formations} /></TabsContent>
            <TabsContent value="trust"><PlayerTrust view={m} /></TabsContent>
          </div>
        </Tabs>
      </section>
    </div>
  );
}

function SeasonBreakdown({ seasons }: { seasons: ManagerSeason[] }) {
  const { t, f } = useI18n();
  const oldest = [...seasons].reverse();
  const num = "tnum text-right font-mono text-[12.5px]";
  return (
    <>
      <ScrollArea>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col.season")}</TableHead>
              <TableHead className="text-right">{t("col.w")}</TableHead>
              <TableHead className="text-right">{t("col.d")}</TableHead>
              <TableHead className="text-right">{t("col.l")}</TableHead>
              <TableHead className="text-right">{t("col.ppg")}</TableHead>
              <TableHead className="text-right">{t("col.finish")}</TableHead>
              <TableHead className="text-right">{t("col.gfga")}</TableHead>
              <TableHead>{t("col.title")}</TableHead>
              <TableHead>{t("col.notes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {oldest.map((s) => (
              <TableRow key={s.season}>
                <TableCell className="text-sm font-medium">{s.season}</TableCell>
                <TableCell className={num}>{s.wins}</TableCell>
                <TableCell className={cn(num, "text-mute")}>{s.draws}</TableCell>
                <TableCell className={cn(num, "text-bad")}>{s.losses}</TableCell>
                <TableCell className={cn(num, "font-medium")}>{f.num(ppg(seasonRecord(s)), 2)}</TableCell>
                <TableCell className={num}>{s.finish ? f.ordinal(s.finish) : DASH}</TableCell>
                <TableCell className={num}>
                  {s.gf}
                  <span className="text-mute">/{s.ga}</span>
                </TableCell>
                <TableCell>{s.titles.length ? <span className="text-good">{t("managers.wonTitle")}</span> : <span className="font-mono text-[11px] text-mute">{DASH}</span>}</TableCell>
                <TableCell className="min-w-[260px] text-xs whitespace-normal text-mute">{s.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="mt-3">
        <div className="kicker mt-6">{t("managers.ppgTrajectory")}</div>
        {oldest.length < 2 ? (
          <p className="mt-3 font-mono text-xs text-mute">{t("managers.single")}</p>
        ) : (
          <PpgTrend points={oldest.map((s) => ({ season: s.season, ppg: ppg(seasonRecord(s)) }))} />
        )}
      </div>
    </>
  );
}

const FILLS = ["var(--ink-0)", "var(--ink-1)", "var(--ink-2-fill)", "var(--ink-3)"];
const fill = (i: number) => FILLS[Math.min(i, FILLS.length - 1)];

function Tactics({ name, formations }: { name: string; formations: FormationAgg[] }) {
  const { t } = useI18n();
  const total = formations.reduce((a, fm) => a + fm.matches, 0);
  const verdict = tacticsVerdict(formations);
  if (!formations.length) return <p className="font-mono text-xs text-mute">{t("managers.noFormationData")}</p>;
  return (
    <>
      <div className="kicker">{t("managers.usage")}</div>
      <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">
        {t("managers.fielded", { name, n: formations.length, total })}
      </h3>
      <div className="mt-[18px] mb-6 flex h-14 overflow-hidden border border-border">
        {formations.map((fm, i) => (
          <div
            key={fm.name}
            title={`${fm.name} · ${Math.round(fm.sharePct)}%`}
            className="flex min-w-14 flex-col items-center justify-center gap-0.5 text-background"
            style={{ width: `${fm.sharePct}%`, background: fill(i) }}
          >
            <span className="text-[13px] font-medium tracking-[-0.012em]">{fm.name}</span>
            <span className="font-mono text-[11px] opacity-85">{Math.round(fm.sharePct)}%</span>
          </div>
        ))}
      </div>
      <div>
        {formations.map((fm, i) => (
          <div key={fm.name} className="grid grid-cols-[80px_1fr_120px_100px] items-center gap-4 border-b border-border py-2.5 last:border-b-0 max-sm:grid-cols-[64px_1fr_96px] max-sm:gap-3">
            <div className="text-[13px] font-medium tracking-[-0.015em]">{fm.name}</div>
            <div className="h-3.5 bg-white/6">
              <div className="h-full" style={{ width: `${fm.sharePct}%`, background: fill(i) }} />
            </div>
            <div className="font-mono text-xs">
              {fm.matches} <span className="text-mute">{t("managers.matches")}</span>
            </div>
            <div className="font-mono text-xs max-sm:col-start-3">
              {Math.round(fm.winPct)}% <span className="text-mute">{t("managers.win")}</span>
            </div>
          </div>
        ))}
      </div>
      {verdict && <Aside>{t(verdict.key, verdict.vars)}</Aside>}
    </>
  );
}

function FormationImpact({ formations }: { formations: FormationAgg[] }) {
  const byWin = [...formations].sort((a, b) => b.winPct - a.winPct);
  const verdict = formationVerdict(byWin);
  const { t } = useI18n();
  if (!byWin.length) return <p className="font-mono text-xs text-mute">{t("managers.noFormationData")}</p>;
  return (
    <>
      <div className="kicker">{t("managers.winRateBy")}</div>
      <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">{t("managers.whichShape")}</h3>
      <div className="mt-2 mb-4">
        {byWin.map((fm) => (
          <div key={fm.name} className="grid grid-cols-[90px_1fr_140px_200px] items-center gap-4 border-b border-border py-3.5 last:border-b-0 max-[880px]:grid-cols-[72px_1fr] max-[880px]:gap-y-2">
            <div className="text-base font-medium tracking-[-0.018em]">{fm.name}</div>
            <div className="relative flex h-7 items-center bg-white/6">
              <div className="h-full bg-foreground" style={{ width: `${fm.winPct}%` }} />
              <span className="absolute right-2.5 font-mono text-xs font-medium text-white mix-blend-difference">{Math.round(fm.winPct)}%</span>
            </div>
            <div className="font-mono text-xs max-[880px]:col-start-2">{t("managers.wdl", { w: fm.w, d: fm.d, l: fm.l })}</div>
            <div className="font-mono text-xs text-mute max-[880px]:col-start-2">
              {t("managers.gfga", { gf: fm.gf, ga: fm.ga, m: fm.matches })}
            </div>
          </div>
        ))}
      </div>
      {verdict && <Aside>{t(verdict.key, verdict.vars)}</Aside>}
    </>
  );
}

function PlayerTrust({ view }: { view: ManagerView }) {
  const { t, f } = useI18n();
  const { xi, frozen, hasPlayerData } = view.trust;
  const youth = [...view.seasons].reverse();
  const num = "tnum text-right font-mono text-[12.5px]";
  return (
    <div className="grid grid-cols-[1.2fr_1fr] gap-8 max-[880px]:grid-cols-1">
      <div className="min-w-0">
        <div className="kicker">{t("managers.xi")}</div>
        <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">{t("managers.mostApps")}</h3>
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.player")}</TableHead>
                <TableHead>{t("col.pos")}</TableHead>
                <TableHead className="text-right">{t("col.apps")}</TableHead>
                <TableHead className="text-right">{t("col.min")}</TableHead>
                <TableHead className="text-right">{t("col.rating")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {xi.map((p, i) => (
                <TableRow key={p.playerId}>
                  <TableCell className="text-sm font-medium">
                    <span className="mr-2 font-mono text-[10px] text-mute">{String(i + 1).padStart(2, "0")}</span>
                    {p.player}
                  </TableCell>
                  <TableCell><PosTag pos={p.pos} /></TableCell>
                  <TableCell className={num}>{p.apps}</TableCell>
                  <TableCell className={num}>{f.mins(p.mins)}</TableCell>
                  <TableCell className="text-right"><RatingChip r={p.rating} /></TableCell>
                </TableRow>
              ))}
              {!hasPlayerData && (
                <tr>
                  <td colSpan={5} className="p-6 text-center whitespace-normal text-mute">
                    {t("managers.noPlayerData")}
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <div>
        <div className="kicker">{t("managers.youthIntegration")}</div>
        <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">{t("managers.developOrHoard")}</h3>
        <div className="mt-2 flex flex-col gap-2.5">
          {youth.map((s) => (
            <div key={s.season} className="grid grid-cols-[70px_1fr_110px] items-center gap-3">
              <div className="font-mono text-xs">{s.season}</div>
              <div className="relative flex h-5 items-center bg-white/6" role="img" aria-label={s.academyMinutesPct == null ? t("managers.noData") : t("managers.acadAria", { pct: Math.round(s.academyMinutesPct) })}>
                <div className="h-full bg-good" style={{ width: `${s.academyMinutesPct ?? 0}%` }} />
                <span className="absolute right-2 font-mono text-[11px]">{s.academyMinutesPct == null ? DASH : `${Math.round(s.academyMinutesPct)}%`}</span>
              </div>
              <div className="font-mono text-[11px] text-mute">{t("managers.avgXI", { age: s.avgStartXIAge == null ? DASH : f.num(s.avgStartXIAge, 1) })}</div>
            </div>
          ))}
        </div>

        <div className="mt-[22px]">
          <div className="kicker">{t("managers.promotedFrom")}</div>
          {view.agg.youthPromoted.length === 0 ? (
            <p className="font-mono text-xs text-mute">{t("managers.noPromotions")}</p>
          ) : (
            <ul className="mt-2">
              {view.agg.youthPromoted.map((n) => (
                <li key={n} className="border-b border-border py-1.5 text-sm font-medium tracking-[-0.012em] last:border-b-0">{n}</li>
              ))}
            </ul>
          )}
        </div>

        {frozen.length > 0 && (
          <div className="mt-[22px]">
            <div className="kicker">{t("managers.frozen")}</div>
            <ul className="mt-2">
              {frozen.map((p) => (
                <li key={p.playerId} className="border-b border-border py-1.5 text-[13px] last:border-b-0">
                  <span className="font-medium">{p.player}</span>
                  <span className="ml-2 font-mono text-[11px] text-mute">
                    {t("managers.frozenLine", { pos: f.pos(p.pos), apps: p.apps, mins: f.mins(p.mins) })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
