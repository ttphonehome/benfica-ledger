"use client";

import { Fragment, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { DASH } from "@/i18n/format";
import { useI18n } from "@/i18n/client";
import type { DictKey } from "@/i18n/dictionaries/en";
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
  col.accessor("nick", { header: "col.president", sortingFn: localeText }),
  col.accessor("tenureYears", { header: "col.tenureYrs", meta: { right: true } }),
  col.accessor("seasonCount", { header: "col.seasons", meta: { right: true } }),
  col.accessor("titles", { header: "col.titles", meta: { right: true } }),
  col.accessor("titlesPerSeason", { header: "col.titlesPerSeason", meta: { right: true } }),
  col.accessor("winPct", { header: "col.winPct", meta: { right: true } }),
  col.accessor("ppg", { header: "col.ppg", meta: { right: true } }),
  col.accessor((r) => r.netSpend ?? undefined, { id: "netSpend", header: "col.netSpend", sortUndefined: "last", meta: { right: true } }),
  col.accessor((r) => r.hires.length, { id: "hires", header: "col.managersHired", meta: { right: true } }),
];

const num = "tnum text-right font-mono text-[12.5px]";
const netClass = (n: number | null) => (n == null ? "text-mute" : n < 0 ? "text-bad" : "text-good");

export function PresidentsScreen({ presidents, windowStart, asOf }: { presidents: PresidentView[]; windowStart: string; asOf: string }) {
  const { t, f } = useI18n();
  const [selected, setSelected] = useState(presidents.find((p) => p.agg.current)?.agg.id ?? presidents[0].agg.id);
  const [compareWith, setCompareWith] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "titles", desc: true }]);
  const p = presidents.find((x) => x.agg.id === selected)!;
  const cmp = compareWith && compareWith !== selected ? presidents.find((x) => x.agg.id === compareWith) : undefined;
  const a = p.agg;
  const windowYear = windowStart.slice(0, 4);

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
      <div className="kicker">{t("presidents.kicker")}</div>
      <h1 className="section-h">{t("presidents.title")}</h1>
      <p className="dek">{t("presidents.dek")}</p>

      <TenureTimeline
        start={windowStart}
        asOf={asOf}
        selected={selected}
        onSelect={setSelected}
        bars={presidents.map((x) => ({
          id: x.agg.id,
          label: x.agg.nick,
          suffix: x.appointed < windowStart ? t("presidents.since", { year: x.appointed.slice(0, 4) }) : undefined,
          start: x.appointed,
          end: x.departed,
          titles: x.agg.titles,
          tooltip: t("presidents.tooltip", { nick: x.agg.nick, y: f.num(x.agg.tenureYears, 1), t: x.agg.titles }),
        }))}
      />

      <div className="mt-7 mb-8 border border-border">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-paper-2 px-4 py-3.5">
          <span className="label-mono">{t("presidents.all", { year: windowYear })}</span>
          <span className="font-mono text-[11px] text-mute">{t("presidents.clickRow")}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="label-mono" id="compare-label">{t("presidents.compare")}</span>
            <Select value={compareWith ?? "none"} onValueChange={(v) => setCompareWith(v === "none" ? null : v)}>
              <SelectTrigger aria-labelledby="compare-label" className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="none">{t("presidents.none")}</SelectItem>
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
                    <SortHead key={h.id} column={h.column} label={t(h.column.columnDef.header as DictKey)}
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
                      {r.current && <span className="mr-1.5 inline-block size-[7px] rounded-full bg-good" aria-label={t("current")} />}
                      {r.nick}
                    </button>
                  </TableCell>
                  <TableCell className={num}>{f.num(r.tenureYears, 1)}</TableCell>
                  <TableCell className={num}>{r.seasonCount}</TableCell>
                  <TableCell className={cn(num, "font-medium", r.titles ? "text-good" : "text-mute")}>{r.titles}</TableCell>
                  <TableCell className={num}>{f.num(r.titlesPerSeason, 2)}</TableCell>
                  <TableCell className={cn(num, "font-medium")}>{f.pct(r.winPct)}</TableCell>
                  <TableCell className={num}>{f.num(r.ppg, 2)}</TableCell>
                  <TableCell className={cn(num, netClass(r.netSpend))}>{r.netSpend == null ? DASH : f.net(r.netSpend)}</TableCell>
                  <TableCell className={num}>{r.hires.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      <p className="-mt-5 mb-8 font-mono text-[11px] text-mute">{t("presidents.footnote")}</p>

      {cmp && <Compare a={p.agg} b={cmp.agg} />}

      <section className="mt-10" aria-labelledby="pres-name">
        <div className="kicker">{t("focus.kicker", { nick: a.nick })}</div>
        <h2 id="pres-name" className="section-h mb-1">{a.name}</h2>
        <p className="dek mb-6">
          {t("managers.appointed", { date: f.month(p.appointed) })}
          {p.departed
            ? t("presidents.departed", { date: f.month(p.departed), y: f.num(a.tenureYears, 1) })
            : t("presidents.inOffice", { y: f.num(a.tenureYears, 1) })}
          . {p.notes}
        </p>

        <StatCards cols={5}>
          <StatCard label={t("managers.titles")} big={<>{a.titles}<Suffix>{t("presidents.total")}</Suffix></>}
            sub={t("presidents.titlesSub", { l: a.leagueTitles, c: a.otherTitles, r: f.num(a.titlesPerSeason, 2) })} />
          <StatCard label={t("managers.record")} big={<RecordBig w={a.w} d={a.d} l={a.l} />}
            sub={t("presidents.recordSub", { pct: Math.round(a.winPct), ppg: f.num(a.ppg, 2) })} />
          <StatCard
            label={t("presidents.netSpend")}
            big={a.netSpend == null ? DASH : f.net(a.netSpend)}
            bigClassName={netClass(a.netSpend)}
            sub={a.netSpend == null ? t("presidents.noNet") : t("presidents.netSub", { v: f.net(a.avgNetPerSeason!), n: a.spendSeasons })}
          />
          <StatCard label={t("presidents.stability")} big={<>{a.hires.length}<Suffix>{t("presidents.managers")}</Suffix></>}
            sub={t("presidents.perHire", { y: f.num(a.avgHireYears, 1) })} />
          <StatCard label={t("presidents.avgFinish")} big={a.avgFinish != null ? f.num(a.avgFinish, 1) : DASH}
            sub={t("presidents.acrossLeague", { n: a.seasonCount })} />
        </StatCards>

        <Tabs key={selected} defaultValue="record">
          <UnderlineTabsList>
            <UnderlineTabsTrigger value="record">{t("presidents.tab.record")}</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="managers">{t("presidents.tab.hires")}</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="spending">{t("presidents.tab.spending")}</UnderlineTabsTrigger>
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
  const { t, f } = useI18n();
  const yrs = (n: number) => t("yrs", { n: f.num(n, 1) });
  const net = (n: number | null) => (n == null ? DASH : f.net(n));
  // Higher wins on "compare" rows; spend rows are shown without a winner.
  const rows: [DictKey, string, string, "neutral" | "compare", number?, number?][] = [
    ["presidents.row.tenure", yrs(a.tenureYears), yrs(b.tenureYears), "neutral"],
    ["presidents.row.seasons", String(a.seasonCount), String(b.seasonCount), "neutral"],
    ["presidents.row.titles", String(a.titles), String(b.titles), "compare", a.titles, b.titles],
    ["presidents.row.titlesPerSeason", f.num(a.titlesPerSeason, 2), f.num(b.titlesPerSeason, 2), "compare", a.titlesPerSeason, b.titlesPerSeason],
    ["presidents.row.win", f.pct(a.winPct), f.pct(b.winPct), "compare", a.winPct, b.winPct],
    ["presidents.row.ppg", f.num(a.ppg, 2), f.num(b.ppg, 2), "compare", a.ppg, b.ppg],
    ["presidents.row.net", net(a.netSpend), net(b.netSpend), "neutral"],
    ["presidents.row.netAvg", net(a.avgNetPerSeason), net(b.avgNetPerSeason), "neutral"],
    ["presidents.row.hires", String(a.hires.length), String(b.hires.length), "neutral"],
    ["presidents.row.hireTenure", yrs(a.avgHireYears), yrs(b.avgHireYears), "compare", a.avgHireYears, b.avgHireYears],
  ];
  const better = a.titlesPerSeason >= b.titlesPerSeason ? a : b;
  const worse = better === a ? b : a;
  const cell = "border-b border-border px-[18px] py-[11px] font-mono text-[13px] text-ink-2";
  const diamond = <span className="mx-1.5 align-[2px] text-[9px] text-good" aria-label={t("presidents.higher")}>◆</span>;
  return (
    <section className="mt-8 border border-border px-7 pt-6 pb-[26px] max-sm:px-4" aria-label={t("presidents.h2h")}>
      <div className="kicker">{t("presidents.h2h")}</div>
      <h2 className="section-h mb-[18px]">{t("presidents.vs", { a: a.nick, b: b.nick })}</h2>
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
                {win === "a" && diamond}
              </div>
              <div className={cn(cell, "label-mono text-center whitespace-nowrap")}>{t(label)}</div>
              <div className={cn(cell, win === "b" && "font-medium text-foreground")}>
                {win === "b" && diamond}
                {bv}
              </div>
            </Fragment>
          );
        })}
      </div>
      <Aside>
        {t("presidents.moreTitles", { nick: better.nick, a: f.num(better.titlesPerSeason, 2), b: f.num(worse.titlesPerSeason, 2) })}
        {a.avgNetPerSeason != null && b.avgNetPerSeason != null
          ? t("presidents.smallerBalance", { nick: Math.abs(a.avgNetPerSeason) < Math.abs(b.avgNetPerSeason) ? a.nick : b.nick })
          : t("presidents.noSpendCompare")}
      </Aside>
    </section>
  );
}

function Record({ view }: { view: PresidentView }) {
  const { t, f } = useI18n();
  const a = view.agg;
  const verdict =
    a.titlesPerSeason >= 0.8 && a.winPct >= 70
      ? t("presidents.recordStrong", { r: f.num(a.titlesPerSeason, 2), w: Math.round(a.winPct) })
      : a.titlesPerSeason >= 0.4
        ? t("presidents.recordMid")
        : t("presidents.recordLight", { r: f.num(a.titlesPerSeason, 2) });
  const spendTitle = (s: PresidentSeasonRow) =>
    s.spendNote === "no-data" ? t("presidents.spendNoData") : s.spendNote === "not-in-office" ? t("presidents.spendNotInOffice") : undefined;
  return (
    <>
      <ScrollArea>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col.season")}</TableHead>
              <TableHead>{t("col.manager")}</TableHead>
              <TableHead className="text-right">{t("col.w")}</TableHead>
              <TableHead className="text-right">{t("col.d")}</TableHead>
              <TableHead className="text-right">{t("col.l")}</TableHead>
              <TableHead className="text-right">{t("col.ppg")}</TableHead>
              <TableHead className="text-right">{t("col.finish")}</TableHead>
              <TableHead>{t("col.title")}</TableHead>
              <TableHead className="text-right">{t("col.netSpend")}</TableHead>
              <TableHead>{t("col.notes")}</TableHead>
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
                <TableCell className={cn(num, "font-medium")}>{f.num(s.ppg, 2)}</TableCell>
                <TableCell className={num}>{s.finish ? f.ordinal(s.finish) : DASH}</TableCell>
                <TableCell>{s.titles.length ? <span className="text-good">★ {s.titles.join(" · ")}</span> : <span className="font-mono text-[11px] text-mute">{DASH}</span>}</TableCell>
                <TableCell className={cn(num, netClass(s.net))} title={spendTitle(s)}>{s.net == null ? DASH : f.net(s.net)}</TableCell>
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

function Hires({ agg }: { agg: PresidentAgg }) {
  const { t, tp, f } = useI18n();
  const hires = agg.hires;
  const good = hires.filter((h) => h.verdict === "good").length;
  const bad = hires.filter((h) => h.verdict === "bad").length;
  const trophies = hires.reduce((x, h) => x + h.titles.length, 0);
  const hitRate = hires.length ? (good / hires.length) * 100 : 0;
  const verdictLabel = { good: "verdict.good", bad: "verdict.bad", neutral: "verdict.neutral" } as const;
  return (
    <>
      <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">
        {t("presidents.hiresHeader", { n: tp("hires.appointments", hires.length), hits: tp("hires.hits", good), misses: tp("hires.misses", bad) })}
      </h3>
      <ScrollArea>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col.manager")}</TableHead>
              <TableHead>{t("col.appointed")}</TableHead>
              <TableHead>{t("col.departed")}</TableHead>
              <TableHead className="text-right">{t("col.tenure")}</TableHead>
              <TableHead>{t("col.record")}</TableHead>
              <TableHead className="text-right">{t("col.winPct")}</TableHead>
              <TableHead>{t("col.titles")}</TableHead>
              <TableHead>{t("col.verdict")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hires.map((h) => (
              <TableRow key={h.managerId}>
                <TableCell className="text-sm font-medium">
                  <span aria-label={t("presidents.verdictAria", { v: t(verdictLabel[h.verdict]) })} className={cn("mr-1.5 inline-block size-[7px] rounded-full",
                    h.verdict === "good" ? "bg-good" : h.verdict === "bad" ? "bg-bad" : "bg-mute-2")} />
                  {h.name}
                </TableCell>
                <TableCell className="font-mono text-[12.5px] text-mute">{f.month(h.appointed)}</TableCell>
                <TableCell className="font-mono text-[12.5px] text-mute">{h.departed ? f.month(h.departed) : <span className="text-foreground">{t("presidents.active")}</span>}</TableCell>
                <TableCell className={num}>{t("yrs", { n: f.num(h.years, 1) })}</TableCell>
                <TableCell className="font-mono text-[12.5px]">
                  {h.record.w + h.record.d + h.record.l ? (
                    <>
                      {h.record.w}
                      <span className="text-mute">–{h.record.d}–</span>
                      <span className="text-bad">{h.record.l}</span>
                    </>
                  ) : (
                    <Faint />
                  )}
                </TableCell>
                <TableCell className={cn(num, "font-medium")}>{h.record.w + h.record.d + h.record.l ? f.pct(h.winPct) : <Faint />}</TableCell>
                <TableCell className="text-xs">{h.titles.length ? <span className="text-good">★ {h.titles.join(" · ")}</span> : <Faint />}</TableCell>
                <TableCell className="min-w-[260px] text-xs whitespace-normal text-mute">{h.note || <Faint />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <Aside>
        {hitRate >= 67
          ? t("hires.strong", { g: good, n: hires.length, t: trophies })
          : hitRate >= 50
            ? t("hires.mixed", { hits: tp("hires.hits", good), misses: tp("hires.misses", bad) })
            : t("hires.weak", { g: good, n: hires.length })}
      </Aside>
    </>
  );
}

function Spending({ view }: { view: PresidentView }) {
  const { t, f } = useI18n();
  const a = view.agg;
  const rows = view.seasons;
  const max = Math.max(1, ...rows.flatMap((s) => [s.spent ?? 0, s.received ?? 0]));
  return (
    <>
      <h3 className="mb-[18px] text-lg font-medium tracking-[-0.018em]">{t("presidents.whereMoney")}</h3>
      <Panel
        kicker={t("spending.perSeason")}
        title={t("spending.panelTitle")}
        className="mb-6"
        legend={
          <>
            <LegendSwatch color="bad">{t("legend.spent")}</LegendSwatch>
            <LegendSwatch color="good">{t("legend.received")}</LegendSwatch>
          </>
        }
      >
        <SpendBars max={max} rows={rows.map((s) => ({ season: s.season, spent: s.spent, received: s.received, net: s.net }))} />
      </Panel>
      <ScrollArea>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col.season")}</TableHead>
              <TableHead className="text-right">{t("col.spent")}</TableHead>
              <TableHead className="text-right">{t("col.received")}</TableHead>
              <TableHead className="text-right">{t("col.net")}</TableHead>
              <TableHead className="text-right">{t("col.inPerm")}</TableHead>
              <TableHead className="text-right">{t("col.outPerm")}</TableHead>
              <TableHead>{t("col.manager")}</TableHead>
              <TableHead>{t("col.note")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.season}>
                <TableCell className="text-sm font-medium">{s.season}</TableCell>
                <TableCell className={cn(num, "text-bad")}>{s.spent == null ? <Faint /> : `−${f.total(s.spent)}`}</TableCell>
                <TableCell className={cn(num, "text-good")}>{s.received == null ? <Faint /> : `+${f.total(s.received)}`}</TableCell>
                <TableCell className={cn(num, netClass(s.net))}>{s.net == null ? DASH : f.net(s.net)}</TableCell>
                <TableCell className={num}>{s.bought ?? <Faint />}</TableCell>
                <TableCell className={num}>{s.sold ?? <Faint />}</TableCell>
                <TableCell className="text-xs text-mute">{s.manager}</TableCell>
                <TableCell className="min-w-[260px] text-xs whitespace-normal text-mute">
                  {s.spendNote === "not-in-office" ? t("presidents.predecessor") : ""}
                  {s.notes}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <Aside>
        {a.avgNetPerSeason == null
          ? t("spendVerdict.none")
          : a.avgNetPerSeason < -50
            ? t("spendVerdict.heavy", { v: f.net(a.avgNetPerSeason) })
            : a.avgNetPerSeason < 0
              ? t("spendVerdict.moderate", { v: f.net(a.avgNetPerSeason) })
              : t("spendVerdict.profit", { v: f.net(a.avgNetPerSeason), n: a.spendSeasons })}
      </Aside>
    </>
  );
}
