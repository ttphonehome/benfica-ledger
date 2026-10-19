import type { SeasonContext } from "@/data/schema";
import { DASH, fmtNet } from "@/lib/format";
import type { SpendingTotals } from "@/lib/stats/spending";
import { HeadCell, HeadStrip } from "@/components/common/head-strip";
import { LegendSwatch, Panel, VerdictLine } from "@/components/common/panel";
import { SpendBars } from "@/components/charts/spend-bars";
import { ScrollArea } from "@/components/data-table/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function SpendingScreen({
  season,
  totals,
  context,
}: {
  season: string;
  totals: SpendingTotals;
  context: Record<string, SeasonContext>;
}) {
  const n = totals.seasons.length;
  const num = "tnum text-right font-mono text-[13px]";
  return (
    <div>
      <div className="kicker">Spending Trends · {n} seasons</div>
      <h1 className="section-h">Is the board building, or burning?</h1>
      <p className="dek">{n} seasons of cash flow, side by side. The pattern matters more than any single window.</p>

      <HeadStrip>
        <HeadCell label="Total spent" value={`€${totals.spent}m`} mono />
        <HeadCell label="Total received" value={`€${totals.received}m`} mono />
        <HeadCell label={`Net (${n} seasons)`} value={fmtNet(totals.net)} mono />
        <HeadCell label="Avg net / season" value={fmtNet(totals.avgNet)} mono />
        <HeadCell label="Permanents in" value={totals.bought} mono />
      </HeadStrip>

      <Panel
        kicker="Per season"
        title="Spent · Received · Net."
        legend={
          <>
            <LegendSwatch color="bad">Spent</LegendSwatch>
            <LegendSwatch color="good">Received</LegendSwatch>
            <span>Bars scaled to €{totals.max}m</span>
          </>
        }
      >
        <SpendBars
          current={season}
          max={totals.max}
          rows={totals.seasons.map((s) => ({
            season: s.season,
            spent: Math.round(s.spent),
            received: Math.round(s.received),
            net: s.net,
          }))}
        />
      </Panel>

      <div className="mb-8 border border-border">
        <div className="border-b border-border bg-paper-2 px-4 py-3.5">
          <span className="label-mono">Detailed breakdown</span>
        </div>
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
                <TableHead className="text-right">Loans in</TableHead>
                <TableHead className="text-right">Loans out</TableHead>
                <TableHead className="text-right">Avg fee / signing</TableHead>
                <TableHead>Context</TableHead>
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
                    <TableCell className={cn(num, "text-bad")}>−€{Math.round(s.spent)}m</TableCell>
                    <TableCell className={cn(num, "text-good")}>+€{Math.round(s.received)}m</TableCell>
                    <TableCell className={cn(num, s.net < 0 ? "text-bad" : "text-good")}>{fmtNet(s.net)}</TableCell>
                    <TableCell className={num}>{s.bought}</TableCell>
                    <TableCell className={num}>{s.sold}</TableCell>
                    <TableCell className={num}>{s.loansIn}</TableCell>
                    <TableCell className={num}>{s.loansOut}</TableCell>
                    <TableCell className={num}>{s.avgFee == null ? DASH : `€${s.avgFee.toFixed(1)}m`}</TableCell>
                    <TableCell className="text-xs text-mute">{ctx ? `${ctx.finish.split(",")[0]} · ${ctx.points}pts` : DASH}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {totals.seasons.some((s) => s.undisclosedIn || s.undisclosedOut) && (
        <p className="-mt-5 mb-8 font-mono text-[11px] text-mute">
          Totals exclude {totals.seasons.reduce((a, s) => a + s.undisclosedIn + s.undisclosedOut, 0)} permanent deals with undisclosed fees.
        </p>
      )}

      <VerdictLine className="mt-6">
        Over {n} seasons the club spent <span className="font-mono text-bad">€{totals.spent}m</span> and recouped{" "}
        <span className="font-mono text-good">€{totals.received}m</span>, a net of{" "}
        <span className={cn("font-mono", totals.net < 0 ? "text-bad" : "text-good")}>{fmtNet(totals.net)}</span>.{" "}
        {totals.net < 0
          ? "Cash flowed out of the club on aggregate. Trophies, development and stadium income have to make up the difference."
          : "The selling model worked: the squad was funded by its own academy and shrewd resales."}
      </VerdictLine>
    </div>
  );
}
