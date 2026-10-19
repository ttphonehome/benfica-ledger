import type { SeasonContext } from "@/data/schema";
import type { Lang } from "@/i18n/config";
import { getI18n } from "@/i18n";
import { DASH } from "@/i18n/format";
import type { SpendingTotals } from "@/lib/stats/spending";
import { HeadCell, HeadStrip } from "@/components/common/head-strip";
import { LegendSwatch, Panel, VerdictLine } from "@/components/common/panel";
import { SpendBars } from "@/components/charts/spend-bars";
import { ScrollArea } from "@/components/data-table/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function SpendingScreen({
  lang,
  season,
  totals,
  context,
}: {
  lang: Lang;
  season: string;
  totals: SpendingTotals;
  context: Record<string, SeasonContext>;
}) {
  const { t, f } = getI18n(lang);
  const n = totals.seasons.length;
  const num = "tnum text-right font-mono text-[13px]";
  const undisclosed = totals.seasons.reduce((a, s) => a + s.undisclosedIn + s.undisclosedOut, 0);
  const [before, rest] = t("spending.verdict", { n, spent: "§1", received: "§2", net: "§3" }).split("§1");
  const [mid, rest2] = rest.split("§2");
  const [mid2, after] = rest2.split("§3");

  return (
    <div>
      <div className="kicker">{t("spending.kicker", { n })}</div>
      <h1 className="section-h">{t("spending.title")}</h1>
      <p className="dek">{t("spending.dek", { n })}</p>

      <HeadStrip>
        <HeadCell label={t("spending.totalSpent")} value={f.total(totals.spent)} mono />
        <HeadCell label={t("spending.totalReceived")} value={f.total(totals.received)} mono />
        <HeadCell label={t("spending.netN", { n })} value={f.net(totals.net)} mono />
        <HeadCell label={t("spending.avgNet")} value={f.net(totals.avgNet)} mono />
        <HeadCell label={t("spending.permIn")} value={totals.bought} mono />
      </HeadStrip>

      <Panel
        kicker={t("spending.perSeason")}
        title={t("spending.panelTitle")}
        legend={
          <>
            <LegendSwatch color="bad">{t("legend.spent")}</LegendSwatch>
            <LegendSwatch color="good">{t("legend.received")}</LegendSwatch>
            <span>{t("legend.scaled", { max: f.total(totals.max) })}</span>
          </>
        }
      >
        <SpendBars
          current={season}
          max={totals.max}
          rows={totals.seasons.map((s) => ({ season: s.season, spent: Math.round(s.spent), received: Math.round(s.received), net: s.net }))}
        />
      </Panel>

      <div className="mb-8 border border-border">
        <div className="border-b border-border bg-paper-2 px-4 py-3.5">
          <span className="label-mono">{t("spending.detailed")}</span>
        </div>
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
                <TableHead className="text-right">{t("col.loansIn")}</TableHead>
                <TableHead className="text-right">{t("col.loansOut")}</TableHead>
                <TableHead className="text-right">{t("col.avgFee")}</TableHead>
                <TableHead>{t("col.context")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totals.seasons.map((s) => {
                const ctx = context[s.season];
                const current = s.season === season;
                return (
                  <TableRow key={s.season} className={cn(current && "bg-paper-2")} aria-current={current ? "true" : undefined}>
                    <TableCell className="font-mono text-[13px] font-medium">
                      {current && <span className="mr-1">›</span>}
                      {s.season}
                    </TableCell>
                    <TableCell className={cn(num, "text-bad")}>−{f.total(s.spent)}</TableCell>
                    <TableCell className={cn(num, "text-good")}>+{f.total(s.received)}</TableCell>
                    <TableCell className={cn(num, s.net < 0 ? "text-bad" : "text-good")}>{f.net(s.net)}</TableCell>
                    <TableCell className={num}>{s.bought}</TableCell>
                    <TableCell className={num}>{s.sold}</TableCell>
                    <TableCell className={num}>{s.loansIn}</TableCell>
                    <TableCell className={num}>{s.loansOut}</TableCell>
                    <TableCell className={num}>{s.avgFee == null ? DASH : f.money1(s.avgFee)}</TableCell>
                    <TableCell className="text-xs text-mute">
                      {ctx?.leaguePosition != null ? t("spending.ctx", { finish: f.ordinal(ctx.leaguePosition), points: ctx.points }) : DASH}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {undisclosed > 0 && <p className="-mt-5 mb-8 font-mono text-[11px] text-mute">{t("spending.excluded", { n: undisclosed })}</p>}

      <VerdictLine className="mt-6">
        {before}
        <span className="font-mono text-bad">{f.total(totals.spent)}</span>
        {mid}
        <span className="font-mono text-good">{f.total(totals.received)}</span>
        {mid2}
        <span className={cn("font-mono", totals.net < 0 ? "text-bad" : "text-good")}>{f.net(totals.net)}</span>
        {after} {t(totals.net < 0 ? "spending.negative" : "spending.positive")}
      </VerdictLine>
    </div>
  );
}
