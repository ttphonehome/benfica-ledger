"use client";

import { Fragment, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { DASH, fmtMonth, fmtNet } from "@/lib/format";
import type { PresidentAgg, PresidentSeasonRow } from "@/lib/stats/presidents";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortHead } from "@/components/data-table/sort-header";
import { localeText } from "@/components/data-table/sorting";
import { ScrollArea } from "@/components/data-table/scroll-area";
import { Aside, LegendSwatch, Panel } from "@/components/common/panel";
import { Faint } from "@/components/common/cells";
import { RecordBig, StatCard, StatCards, Suffix } from "@/components/common/stat-cards";
import { TenureTimeline } from "@/components/charts/tenure-timeline";
import { SpendBars } from "@/components/charts/spend-bars";
import { cn } from "@/lib/utils";

export interface PresidentView {
  agg: PresidentAgg;
  appointed: string;
  departed: string | null;
  notes: string;
  seasons: PresidentSeasonRow[]; // oldest first
}

const col = createColumnHelper<PresidentAgg>();
const columns = [
  col.accessor("nick", { header: "President", sortingFn: localeText }),
  col.accessor("tenureYears", { header: "Tenure (yrs)", meta: { right: true } }),
  col.accessor("seasonCount", { header: "Seasons", meta: { right: true } }),
  col.accessor("titles", { header: "Titles", meta: { right: true } }),
  col.accessor("titlesPerSeason", { header: "Titles/season", meta: { right: true } }),
  col.accessor("winPct", { header: "Win %", meta: { right: true } }),
  col.accessor("ppg", { header: "Pts/g", meta: { right: true } }),
  col.accessor((r) => r.netSpend ?? undefined, { id: "netSpend", header: "Net spend", sortUndefined: "last", meta: { right: true } }),
  col.accessor((r) => r.hires.length, { id: "hires", header: "Managers hired", meta: { right: true } }),
];

const num = "tnum text-right font-mono text-[12.5px]";
const netClass = (n: number | null) => (n == null ? "text-mute" : n < 0 ? "text-bad" : "text-good");

export function PresidentsScreen({ presidents, windowStart, asOf }: { presidents: PresidentView[]; windowStart: string; asOf: string }) {
  const [selected, setSelected] = useState(presidents.find((p) => p.agg.current)?.agg.id ?? presidents[0].agg.id);
  const [compareWith, setCompareWith] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "titles", desc: true }]);
  const p = presidents.find((x) => x.agg.id === selected)!;
  const cmp = compareWith && compareWith !== selected ? presidents.find((x) => x.agg.id === compareWith) : undefined;
  const a = p.agg;

  // Stable data identity matters: a new array each render makes TanStack
  // auto-reset its state, which re-renders, which makes a new array, forever.
  const rows = useMemo(() => presidents.map((x) => x.agg), [presidents]);

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

  return (
    <div>
      <div className="kicker">Presidency Era · Institutional audit</div>
      <h1 className="section-h">The boardroom layer.</h1>
      <p className="dek">
        Who set the strategy, signed the cheques, and hired the managers. Presidents are judged across years, not seasons.
      </p>

      <TenureTimeline
        start={windowStart}
        asOf={asOf}
        selected={selected}
        onSelect={setSelected}
        bars={presidents.map((x) => ({
          id: x.agg.id,
          label: x.agg.nick,
          suffix: x.appointed < windowStart ? `since ${x.appointed.slice(0, 4)}` : undefined,
          start: x.appointed,
          end: x.departed,
          titles: x.agg.titles,
          tooltip: `${x.agg.nick} · ${x.agg.tenureYears.toFixed(1)} yrs · ${x.agg.titles} title${x.agg.titles === 1 ? "" : "s"} in window`,
        }))}
      />

      <div className="mt-7 mb-8 border border-border">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-paper-2 px-4 py-3.5">
          <span className="label-mono">All presidents · since {windowStart.slice(0, 4)}</span>
          <span className="font-mono text-[11px] text-mute">Click a row to focus · current era marked</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="label-mono" id="compare-label">Compare</span>
            <Select value={compareWith ?? "none"} onValueChange={(v) => setCompareWith(v === "none" ? null : v)}>
              <SelectTrigger aria-labelledby="compare-label" className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="none">None</SelectItem>
                {presidents.filter((x) => x.agg.id !== selected).map((x) => (
                  <SelectItem key={x.agg.id} value={x.agg.id}>{x.agg.nick}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                <TableRow key={r.id} onClick={() => setSelected(r.id)}
                  className={cn("cursor-pointer hover:bg-paper-2", (r.id === selected || r.id === cmp?.agg.id) && "bg-paper-2")}>
                  <TableCell className="text-sm font-medium tracking-[-0.012em]">
                    <button type="button" aria-pressed={r.id === selected}
                      onClick={(e) => { e.stopPropagation(); setSelected(r.id); }}
                      className="-mx-1 inline-flex items-center px-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none touch:min-h-11">
                      {r.current && <span className="mr-1.5 inline-block size-[7px] rounded-full bg-good" aria-label="Current" />}
                      {r.nick}
                    </button>
                  </TableCell>
                  <TableCell className={num}>{r.tenureYears.toFixed(1)}</TableCell>
                  <TableCell className={num}>{r.seasonCount}</TableCell>
                  <TableCell className={cn(num, "font-medium", r.titles ? "text-good" : "text-mute")}>{r.titles}</TableCell>
                  <TableCell className={num}>{r.titlesPerSeason.toFixed(2)}</TableCell>
                  <TableCell className={cn(num, "font-medium")}>{r.winPct.toFixed(0)}%</TableCell>
                  <TableCell className={num}>{r.ppg.toFixed(2)}</TableCell>
                  <TableCell className={cn(num, netClass(r.netSpend))}>{r.netSpend == null ? DASH : fmtNet(r.netSpend)}</TableCell>
                  <TableCell className={num}>{r.hires.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      <p className="-mt-5 mb-8 font-mono text-[11px] text-mute">
        Net spend counts seasons with transfer data, credited to whoever was in office on 1 July. Titles/season covers the seasons listed, not the whole tenure.
      </p>

      {cmp && <Compare a={p.agg} b={cmp.agg} />}

      <section className="mt-10" aria-labelledby="pres-name">
        <div className="kicker">In Focus · {a.nick}</div>
        <h2 id="pres-name" className="section-h mb-1">{a.name}</h2>
        <p className="dek mb-6">
          Appointed {fmtMonth(p.appointed)}
          {p.departed
            ? ` · departed ${fmtMonth(p.departed)} · ${a.tenureYears.toFixed(1)} years in office`
            : ` · in office · ${a.tenureYears.toFixed(1)} years and counting`}
          . {p.notes}
        </p>

        <StatCards cols={5}>
          <StatCard label="Titles" big={<>{a.titles}<Suffix>total</Suffix></>}
            sub={`${a.leagueTitles} league · ${a.otherTitles} cup · ${a.titlesPerSeason.toFixed(2)} / season`} />
          <StatCard label="Record" big={<RecordBig w={a.w} d={a.d} l={a.l} />} sub={`${a.winPct.toFixed(0)}% win · ${a.ppg.toFixed(2)} pts/game`} />
          <StatCard
            label="Net spend"
            big={a.netSpend == null ? DASH : fmtNet(a.netSpend)}
            bigClassName={netClass(a.netSpend)}
            sub={a.netSpend == null ? "No transfer data credited in this window" : `avg ${fmtNet(a.avgNetPerSeason!)} / season · ${a.spendSeasons} season${a.spendSeasons === 1 ? "" : "s"} with data`}
          />
          <StatCard label="Stability" big={<>{a.hires.length}<Suffix>managers</Suffix></>} sub={`avg ${a.avgHireYears.toFixed(1)} years per hire`} />
          <StatCard label="Avg finish" big={a.avgFinish != null ? a.avgFinish.toFixed(1) : DASH} sub={`Across ${a.seasonCount} league seasons`} />
        </StatCards>

        <Tabs key={selected} defaultValue="record">
          <UnderlineTabsList>
            <UnderlineTabsTrigger value="record">Presidency Record</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="managers">Manager Hires</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="spending">Spending &amp; Investment</UnderlineTabsTrigger>
          </UnderlineTabsList>
          <div className="min-h-[200px]">
            <TabsContent value="record"><Record view={p} /></TabsContent>
            <TabsContent value="managers"><Hires agg={a} /></TabsContent>
            <TabsContent value="spending"><Spending view={p} /></TabsContent>
          </div>
        </Tabs>
      </section>
    </div>
  );
}

function Compare({ a, b }: { a: PresidentAgg; b: PresidentAgg }) {
  // Higher wins on these rows; spend rows are shown without a winner.
  const rows: [string, string, string, "neutral" | "compare", number?, number?][] = [
    ["Tenure", `${a.tenureYears.toFixed(1)} yrs`, `${b.tenureYears.toFixed(1)} yrs`, "neutral"],
    ["Seasons in window", String(a.seasonCount), String(b.seasonCount), "neutral"],
    ["Titles", String(a.titles), String(b.titles), "compare", a.titles, b.titles],
    ["Titles / season", a.titlesPerSeason.toFixed(2), b.titlesPerSeason.toFixed(2), "compare", a.titlesPerSeason, b.titlesPerSeason],
    ["Win %", `${a.winPct.toFixed(0)}%`, `${b.winPct.toFixed(0)}%`, "compare", a.winPct, b.winPct],
    ["Pts / game", a.ppg.toFixed(2), b.ppg.toFixed(2), "compare", a.ppg, b.ppg],
    ["Net spend (total)", a.netSpend == null ? DASH : fmtNet(a.netSpend), b.netSpend == null ? DASH : fmtNet(b.netSpend), "neutral"],
    ["Net / season (avg)", a.avgNetPerSeason == null ? DASH : fmtNet(a.avgNetPerSeason), b.avgNetPerSeason == null ? DASH : fmtNet(b.avgNetPerSeason), "neutral"],
    ["Managers hired", String(a.hires.length), String(b.hires.length), "neutral"],
    ["Avg manager tenure", `${a.avgHireYears.toFixed(1)} yrs`, `${b.avgHireYears.toFixed(1)} yrs`, "compare", a.avgHireYears, b.avgHireYears],
  ];
  const better = a.titlesPerSeason >= b.titlesPerSeason ? a : b;
  const worse = better === a ? b : a;
  const cell = "border-b border-border px-[18px] py-[11px] font-mono text-[13px] text-ink-2";
  return (
    <section className="mt-8 border border-border px-7 pt-6 pb-[26px] max-sm:px-4" aria-label="Head to head">
      <div className="kicker">Head to head</div>
      <h2 className="section-h mb-[18px]">{a.nick} · vs · {b.nick}</h2>
      <div className="grid grid-cols-[1fr_auto_1fr]">
        <div className="border-b border-rule-strong px-[18px] py-2 text-right text-lg font-semibold tracking-[-0.022em]">{a.nick}</div>
        <div className="border-b border-rule-strong" />
        <div className="border-b border-rule-strong px-[18px] py-2 text-lg font-semibold tracking-[-0.022em]">{b.nick}</div>
        {rows.map(([label, av, bv, kind, an, bn]) => {
          const win = kind === "compare" && an !== bn ? ((an ?? 0) > (bn ?? 0) ? "a" : "b") : null;
          return (
            <Fragment key={label}>
              <div className={cn(cell, "text-right", win === "a" && "font-medium text-foreground")}>
                {av}
                {win === "a" && <Diamond />}
              </div>
              <div className={cn(cell, "label-mono text-center whitespace-nowrap")}>{label}</div>
              <div className={cn(cell, win === "b" && "font-medium text-foreground")}>
                {win === "b" && <Diamond />}
                {bv}
              </div>
            </Fragment>
          );
        })}
      </div>
      <Aside>
        {better.nick} produced more titles per season ({better.titlesPerSeason.toFixed(2)} vs {worse.titlesPerSeason.toFixed(2)}).
        {a.avgNetPerSeason != null && b.avgNetPerSeason != null
          ? ` ${Math.abs(a.avgNetPerSeason) < Math.abs(b.avgNetPerSeason) ? a.nick : b.nick} ran the smaller average transfer balance per season.`
          : " Spend can't be compared: one side has no transfer data in this window."}
      </Aside>
    </section>
  );
}

function Diamond() {
  return <span className="mx-1.5 align-[2px] text-[9px] text-good" aria-label="higher">◆</span>;
}

function Record({ view }: { view: PresidentView }) {
  const a = view.agg;
  const verdict =
    a.titlesPerSeason >= 0.8 && a.winPct >= 70
      ? `A title rate of ${a.titlesPerSeason.toFixed(2)} per season at a ${a.winPct.toFixed(0)}% win clip. A successful era by any institutional measure.`
      : a.titlesPerSeason >= 0.4
        ? "One trophy roughly every other season. Competitive but not dominant."
        : `Light on silverware: ${a.titlesPerSeason.toFixed(2)} titles per season.`;
  return (
    <>
      <ScrollArea>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Season</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead className="text-right">W</TableHead>
              <TableHead className="text-right">D</TableHead>
              <TableHead className="text-right">L</TableHead>
              <TableHead className="text-right">Pts/g</TableHead>
              <TableHead className="text-right">Finish</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Net spend</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.seasons.map((s) => (
              <TableRow key={s.season}>
                <TableCell className="text-sm font-medium">{s.season}</TableCell>
                <TableCell className="text-xs text-mute">{s.manager}</TableCell>
                <TableCell className={num}>{s.record.w}</TableCell>
                <TableCell className={cn(num, "text-mute")}>{s.record.d}</TableCell>
                <TableCell className={cn(num, "text-bad")}>{s.record.l}</TableCell>
                <TableCell className={cn(num, "font-medium")}>{s.ppg.toFixed(2)}</TableCell>
                <TableCell className={num}>{s.finish ? ordinal(s.finish) : DASH}</TableCell>
                <TableCell>{s.titles.length ? <span className="text-good">★ {s.titles.join(" · ")}</span> : <span className="font-mono text-[11px] text-mute">{DASH}</span>}</TableCell>
                <TableCell className={cn(num, netClass(s.net))} title={spendTitle(s)}>{s.net == null ? DASH : fmtNet(s.net)}</TableCell>
                <TableCell className="min-w-[280px] text-xs whitespace-normal text-mute">{s.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <Aside>{verdict}</Aside>
    </>
  );
}

function spendTitle(s: PresidentSeasonRow) {
  if (s.spendNote === "no-data") return "No transfer rows for this season yet";
  if (s.spendNote === "not-in-office") return "Credited to the president in office on 1 July";
  return undefined;
}

function Hires({ agg }: { agg: PresidentAgg }) {
  const hires = agg.hires;
  const good = hires.filter((h) => h.verdict === "good").length;
  const bad = hires.filter((h) => h.verdict === "bad").length;
  const trophies = hires.reduce((x, h) => x + h.titles.length, 0);
  const hitRate = hires.length ? (good / hires.length) * 100 : 0;
  return (
    <>
      <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">
        {hires.length} appointment{hires.length === 1 ? "" : "s"} · {good} hit{good === 1 ? "" : "s"} · {bad} miss{bad === 1 ? "" : "es"}
      </h3>
      <ScrollArea>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manager</TableHead>
              <TableHead>Appointed</TableHead>
              <TableHead>Departed</TableHead>
              <TableHead className="text-right">Tenure</TableHead>
              <TableHead>Record (W–D–L)</TableHead>
              <TableHead className="text-right">Win %</TableHead>
              <TableHead>Titles</TableHead>
              <TableHead>Verdict</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hires.map((h) => (
              <TableRow key={h.managerId}>
                <TableCell className="text-sm font-medium">
                  <span aria-label={`Verdict: ${h.verdict}`} className={cn("mr-1.5 inline-block size-[7px] rounded-full",
                    h.verdict === "good" ? "bg-good" : h.verdict === "bad" ? "bg-bad" : "bg-mute-2")} />
                  {h.name}
                </TableCell>
                <TableCell className="font-mono text-[12.5px] text-mute">{fmtMonth(h.appointed)}</TableCell>
                <TableCell className="font-mono text-[12.5px] text-mute">{h.departed ? fmtMonth(h.departed) : <span className="text-foreground">Active</span>}</TableCell>
                <TableCell className={num}>{h.years.toFixed(1)} yrs</TableCell>
                <TableCell className="font-mono text-[12.5px]">
                  {h.record.w}
                  <span className="text-mute">–{h.record.d}–</span>
                  <span className="text-bad">{h.record.l}</span>
                </TableCell>
                <TableCell className={cn(num, "font-medium")}>{h.winPct.toFixed(0)}%</TableCell>
                <TableCell className="text-xs">{h.titles.length ? <span className="text-good">★ {h.titles.join(" · ")}</span> : <Faint />}</TableCell>
                <TableCell className="min-w-[260px] text-xs whitespace-normal text-mute">{h.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <Aside>
        {hitRate >= 67
          ? `Hiring track record: ${good} of ${hires.length} hits. ${trophies} trophies across all appointments. Strong instincts in the chair.`
          : hitRate >= 50
            ? `Mixed bag: ${good} hits, ${bad} misses. Some appointments delivered, others didn't.`
            : `Most appointments under-delivered. ${good} of ${hires.length} considered hits.`}
      </Aside>
    </>
  );
}

function Spending({ view }: { view: PresidentView }) {
  const a = view.agg;
  const rows = view.seasons;
  const max = Math.max(1, ...rows.flatMap((s) => [s.spent ?? 0, s.received ?? 0]));
  return (
    <>
      <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">Where did the money go?</h3>
      <Panel
        kicker="Per season"
        title="Spent · Received · Net."
        className="mb-6"
        legend={
          <>
            <LegendSwatch color="bad">Spent</LegendSwatch>
            <LegendSwatch color="good">Received</LegendSwatch>
          </>
        }
      >
        <SpendBars max={max} rows={rows.map((s) => ({ season: s.season, spent: s.spent, received: s.received, net: s.net }))} />
      </Panel>
      <ScrollArea>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Season</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">In (perm.)</TableHead>
              <TableHead className="text-right">Out (perm.)</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.season}>
                <TableCell className="text-sm font-medium">{s.season}</TableCell>
                <TableCell className={cn(num, "text-bad")}>{s.spent == null ? <Faint /> : `−€${s.spent}m`}</TableCell>
                <TableCell className={cn(num, "text-good")}>{s.received == null ? <Faint /> : `+€${s.received}m`}</TableCell>
                <TableCell className={cn(num, netClass(s.net))}>{s.net == null ? DASH : fmtNet(s.net)}</TableCell>
                <TableCell className={num}>{s.bought ?? <Faint />}</TableCell>
                <TableCell className={num}>{s.sold ?? <Faint />}</TableCell>
                <TableCell className="text-xs text-mute">{s.manager}</TableCell>
                <TableCell className="min-w-[260px] text-xs whitespace-normal text-mute">
                  {s.spendNote === "not-in-office" ? "Window spend credited to the predecessor. " : ""}
                  {s.notes}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <Aside>
        {a.avgNetPerSeason == null
          ? "No transfer data in this window yet, so there is no spending verdict."
          : a.avgNetPerSeason < -50
            ? `Heavy investor. ${fmtNet(a.avgNetPerSeason)} per season on average; the squad has to deliver on that cheque.`
            : a.avgNetPerSeason < 0
              ? `Moderate spender. ${fmtNet(a.avgNetPerSeason)} per season leaves room for academy and self-funding.`
              : `Profitable era on aggregate (${fmtNet(a.avgNetPerSeason)} per season across ${a.spendSeasons} with data). The selling model carried the financials.`}
      </Aside>
    </>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
