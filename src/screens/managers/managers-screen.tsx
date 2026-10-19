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
import { DASH, fmtMins, fmtMonth } from "@/lib/format";
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
  col.accessor("nick", { header: "Manager", sortingFn: localeText }),
  col.accessor("seasonCount", { header: "Seasons", meta: { right: true } }),
  col.accessor("matches", { header: "Matches", meta: { right: true } }),
  col.accessor("w", { header: "Record (W–D–L)" }),
  col.accessor("winPct", { header: "Win %", meta: { right: true } }),
  col.accessor("ppg", { header: "Pts/g", meta: { right: true } }),
  col.accessor((r) => r.titles.length, { id: "titles", header: "Titles", meta: { right: true } }),
  col.accessor((r) => r.avgFinish ?? undefined, { id: "avgFinish", header: "Avg finish", sortUndefined: "last", meta: { right: true } }),
  col.accessor((r) => r.avgAcademy ?? undefined, { id: "avgAcademy", header: "Acad. mins %", sortUndefined: "last", meta: { right: true } }),
];

export function ManagersScreen({ managers, asOf }: { managers: ManagerView[]; asOf: string }) {
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
  const anchorPct = anchor && latest ? (anchor.matches / Math.max(1, latest.formations.reduce((s, f) => s + f.matches, 0))) * 100 : null;
  const num = "tnum text-right font-mono text-[12.5px]";

  return (
    <div>
      <div className="kicker">Manager Era · Since {earliest.appointed.slice(0, 4)}</div>
      <h1 className="section-h">Who actually got the most out of this club?</h1>
      <p className="dek">
        Every manager since {earliest.agg.name} took over in {earliest.appointed.slice(0, 4)}. Win rate, formation identity, titles,
        and how much they trusted the academy.
      </p>

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
          tooltip: `${x.agg.nick} · ${x.agg.tenureMonths} months · ${x.agg.titles.length} title${x.agg.titles.length === 1 ? "" : "s"}`,
        }))}
      />

      <div className="mt-7 mb-8 border border-border">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-paper-2 px-4 py-3.5">
          <span className="label-mono">All managers</span>
          <span className="font-mono text-[11px] text-mute">Click a row to deep-dive · current era marked</span>
        </div>
        <ScrollArea>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <SortHead key={h.id} column={h.column} label={String(h.column.columnDef.header)}
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
                      {r.current && <span className="mr-1.5 inline-block size-[7px] rounded-full bg-good" aria-label="Current" />}
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
                  <TableCell className={cn(num, "font-medium")}>{r.winPct.toFixed(0)}%</TableCell>
                  <TableCell className={num}>{r.ppg.toFixed(2)}</TableCell>
                  <TableCell className={num}>
                    {r.titles.length ? <span className="text-good" aria-label={`${r.titles.length} titles`}>{"★".repeat(r.titles.length)}</span> : <Faint />}
                  </TableCell>
                  <TableCell className={num}>{r.avgFinish != null ? r.avgFinish.toFixed(1) : <Faint />}</TableCell>
                  <TableCell className={num}>{r.avgAcademy == null ? <Faint /> : `${Math.round(r.avgAcademy)}%`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <section className="mt-10" aria-labelledby="focus-name">
        <div className="kicker">In Focus · {a.nick}</div>
        <h2 id="focus-name" className="section-h mb-1">{a.name}</h2>
        <p className="dek mb-6">
          Appointed {fmtMonth(m.appointed)}
          {m.departed
            ? ` · departed ${fmtMonth(m.departed)} · ${a.tenureMonths} months in charge`
            : ` · still in charge · ${a.tenureMonths} months and counting`}
          .
        </p>

        <StatCards cols={4}>
          <StatCard label="Record" big={<RecordBig w={a.w} d={a.d} l={a.l} />} sub={`${a.winPct.toFixed(0)}% win rate · ${a.ppg.toFixed(2)} pts/game`} />
          <StatCard label="Titles" big={<>{a.titles.length}<Suffix>won</Suffix></>} sub={a.titles.join(" · ") || "No titles in this tenure"} />
          <StatCard
            label="Youth"
            big={a.avgAcademy == null ? DASH : <>{Math.round(a.avgAcademy)}<Suffix>% acad. mins</Suffix></>}
            sub={`${a.youthPromoted.length} academy player${a.youthPromoted.length === 1 ? "" : "s"} promoted`}
          />
          <StatCard
            label="Tactical anchor"
            big={anchor?.name ?? DASH}
            bigClassName="text-[26px]"
            sub={anchor && latest ? `Primary in ${anchorPct!.toFixed(0)}% of ${latest.season} matches` : "No formation data"}
          />
        </StatCards>

        <Tabs key={selected} defaultValue="seasons">
          <UnderlineTabsList>
            <UnderlineTabsTrigger value="seasons">Season Breakdown</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="tactics">Tactics</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="formation">Formation Impact</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="trust">Player Trust</UnderlineTabsTrigger>
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
  const oldest = [...seasons].reverse();
  const num = "tnum text-right font-mono text-[12.5px]";
  return (
    <>
      <ScrollArea>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Season</TableHead>
              <TableHead className="text-right">W</TableHead>
              <TableHead className="text-right">D</TableHead>
              <TableHead className="text-right">L</TableHead>
              <TableHead className="text-right">Pts/g</TableHead>
              <TableHead className="text-right">Finish</TableHead>
              <TableHead className="text-right">GF/GA</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {oldest.map((s) => (
              <TableRow key={s.season}>
                <TableCell className="text-sm font-medium">{s.season}</TableCell>
                <TableCell className={num}>{s.wins}</TableCell>
                <TableCell className={cn(num, "text-mute")}>{s.draws}</TableCell>
                <TableCell className={cn(num, "text-bad")}>{s.losses}</TableCell>
                <TableCell className={cn(num, "font-medium")}>{ppg(seasonRecord(s)).toFixed(2)}</TableCell>
                <TableCell className={num}>{s.finish ? ordinal(s.finish) : DASH}</TableCell>
                <TableCell className={num}>
                  {s.gf}
                  <span className="text-mute">/{s.ga}</span>
                </TableCell>
                <TableCell>{s.titles.length ? <span className="text-good">★ Won</span> : <span className="font-mono text-[11px] text-mute">{DASH}</span>}</TableCell>
                <TableCell className="min-w-[260px] text-xs whitespace-normal text-mute">{s.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="mt-3">
        <div className="kicker mt-6">Points-per-game trajectory</div>
        {oldest.length < 2 ? (
          <p className="mt-3 font-mono text-xs text-mute">Single season, so no trajectory yet.</p>
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
  const total = formations.reduce((a, f) => a + f.matches, 0);
  const verdict = tacticsVerdict(formations);
  if (!formations.length) return <p className="font-mono text-xs text-mute">No formation data recorded.</p>;
  return (
    <>
      <div className="kicker">Formation usage · all seasons combined</div>
      <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">
        {name} fielded {formations.length} different formation{formations.length === 1 ? "" : "s"} across {total} matches.
      </h3>
      <div className="mt-[18px] mb-6 flex h-14 overflow-hidden border border-border">
        {formations.map((f, i) => (
          <div
            key={f.name}
            title={`${f.name} · ${f.sharePct.toFixed(0)}%`}
            className="flex min-w-14 flex-col items-center justify-center gap-0.5 text-background"
            style={{ width: `${f.sharePct}%`, background: fill(i) }}
          >
            <span className="text-[13px] font-medium tracking-[-0.012em]">{f.name}</span>
            <span className="font-mono text-[11px] opacity-85">{f.sharePct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
      <div>
        {formations.map((f, i) => (
          <div key={f.name} className="grid grid-cols-[80px_1fr_120px_100px] items-center gap-4 border-b border-border py-2.5 last:border-b-0 max-sm:grid-cols-[64px_1fr_96px] max-sm:gap-3">
            <div className="text-[13px] font-medium tracking-[-0.015em]">{f.name}</div>
            <div className="h-3.5 bg-white/6">
              <div className="h-full" style={{ width: `${f.sharePct}%`, background: fill(i) }} />
            </div>
            <div className="font-mono text-xs">
              {f.matches} <span className="text-mute">matches</span>
            </div>
            <div className="font-mono text-xs max-sm:col-start-3">
              {f.winPct.toFixed(0)}% <span className="text-mute">win</span>
            </div>
          </div>
        ))}
      </div>
      {verdict && <Aside>{verdict}</Aside>}
    </>
  );
}

function FormationImpact({ formations }: { formations: FormationAgg[] }) {
  const byWin = [...formations].sort((a, b) => b.winPct - a.winPct);
  const verdict = formationVerdict(byWin);
  if (!byWin.length) return <p className="font-mono text-xs text-mute">No formation data recorded.</p>;
  return (
    <>
      <div className="kicker">Win rate by formation</div>
      <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">Which shape actually works?</h3>
      <div className="mt-2 mb-4">
        {byWin.map((f) => (
          <div key={f.name} className="grid grid-cols-[90px_1fr_140px_200px] items-center gap-4 border-b border-border py-3.5 last:border-b-0 max-[880px]:grid-cols-[72px_1fr] max-[880px]:gap-y-2">
            <div className="text-base font-medium tracking-[-0.018em]">{f.name}</div>
            <div className="relative flex h-7 items-center bg-white/6">
              <div className="h-full bg-foreground" style={{ width: `${f.winPct}%` }} />
              <span className="absolute right-2.5 font-mono text-xs font-medium text-white mix-blend-difference">{f.winPct.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs max-[880px]:col-start-2">
              <span>{f.w}W</span>
              <span className="text-mute">·</span>
              <span className="text-mute">{f.d}D</span>
              <span className="text-mute">·</span>
              <span className="text-bad">{f.l}L</span>
            </div>
            <div className="font-mono text-xs text-mute max-[880px]:col-start-2">
              {f.gf}/{f.ga} GF/GA · {f.matches} matches
            </div>
          </div>
        ))}
      </div>
      {verdict && <Aside>{verdict}</Aside>}
    </>
  );
}

function PlayerTrust({ view }: { view: ManagerView }) {
  const { xi, frozen, hasPlayerData } = view.trust;
  const youth = [...view.seasons].reverse();
  const num = "tnum text-right font-mono text-[12.5px]";
  return (
    <div className="grid grid-cols-[1.2fr_1fr] gap-8 max-[880px]:grid-cols-1">
      <div className="min-w-0">
        <div className="kicker">The XI he trusts</div>
        <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">Most appearances under this manager</h3>
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Pos</TableHead>
                <TableHead className="text-right">Apps</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Rating</TableHead>
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
                  <TableCell className={num}>{fmtMins(p.mins)}</TableCell>
                  <TableCell className="text-right"><RatingChip r={p.rating} /></TableCell>
                </TableRow>
              ))}
              {!hasPlayerData && (
                <tr>
                  <td colSpan={5} className="p-6 text-center whitespace-normal text-mute">
                    No player data for these seasons. Player rows start in 2021-22.
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <div>
        <div className="kicker">Youth integration</div>
        <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">Did he develop, or hoard veterans?</h3>
        <div className="mt-2 flex flex-col gap-2.5">
          {youth.map((s) => (
            <div key={s.season} className="grid grid-cols-[70px_1fr_110px] items-center gap-3">
              <div className="font-mono text-xs">{s.season}</div>
              <div className="relative flex h-5 items-center bg-white/6" role="img" aria-label={s.academyMinutesPct == null ? "No data" : `${s.academyMinutesPct}% academy minutes`}>
                <div className="h-full bg-good" style={{ width: `${s.academyMinutesPct ?? 0}%` }} />
                <span className="absolute right-2 font-mono text-[11px]">{s.academyMinutesPct == null ? DASH : `${Math.round(s.academyMinutesPct)}%`}</span>
              </div>
              <div className="font-mono text-[11px] text-mute">{s.avgStartXIAge == null ? "Avg XI age —" : `Avg XI age ${s.avgStartXIAge.toFixed(1)}`}</div>
            </div>
          ))}
        </div>

        <div className="mt-[22px]">
          <div className="kicker">Promoted from academy</div>
          {view.agg.youthPromoted.length === 0 ? (
            <p className="font-mono text-xs text-mute">No academy promotions credited under this manager.</p>
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
            <div className="kicker">Frozen out · &lt; 10 apps</div>
            <ul className="mt-2">
              {frozen.map((p) => (
                <li key={p.playerId} className="border-b border-border py-1.5 text-[13px] last:border-b-0">
                  <span className="font-medium">{p.player}</span>
                  <span className="ml-2 font-mono text-[11px] text-mute">
                    {p.pos} · {p.apps} apps · {fmtMins(p.mins)} mins
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

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
