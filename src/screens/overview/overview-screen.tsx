import Link from "next/link";
import type { PlayerSeason, SeasonContext } from "@/data/schema";
import { DASH, fmtMins, fmtNet, fmtTotal } from "@/lib/format";
import type { Performers, SquadStats } from "@/lib/stats/overview";
import type { SeasonSpending } from "@/lib/stats/spending";
import { tabHref } from "@/lib/stats/nav";
import { HeadCell, HeadStrip } from "@/components/common/head-strip";
import { LegendSwatch, Panel } from "@/components/common/panel";
import { PosTag, RatingChip } from "@/components/common/cells";
import { NetSpendChart, type NetSpendPoint } from "@/components/charts/net-spend-chart";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/data-table/scroll-area";
import { cn } from "@/lib/utils";

const pct = (v: number | null) => (v == null ? DASH : `${Math.round(v)}%`);

export function OverviewScreen({
  season,
  ctx,
  squad,
  spend,
  verdict,
  trend,
  performers,
}: {
  season: string;
  ctx: SeasonContext | undefined;
  squad: SquadStats;
  spend: SeasonSpending;
  verdict: string;
  trend: NetSpendPoint[];
  performers: Performers;
}) {
  return (
    <div>
      <div className="kicker">Season Overview · {season}</div>
      <h1 className="section-h">The {season} ledger.</h1>
      {ctx && (
        <p className="dek">
          {ctx.finish} · {ctx.points} pts · {ctx.goalsFor} for / {ctx.goalsAgainst} against · {ctx.competitions} · manager {ctx.manager}.
        </p>
      )}

      <HeadStrip>
        <HeadCell label="Squad size" value={squad.squadSize} mono />
        <HeadCell label="Academy share" value={pct(squad.academySharePct)} mono />
        <HeadCell label="Academy minutes" value={pct(squad.academyMinutesPct)} mono />
        <HeadCell label="Avg rating (≥10 apps)" value={squad.avgRating != null ? squad.avgRating.toFixed(2) : DASH} mono />
        <HeadCell label="League finish" value={ctx ? ctx.finish.split(",")[0] : DASH} />
      </HeadStrip>

      <section className="mb-10 grid grid-cols-[1.4fr_1fr] border border-border bg-paper-2 max-[880px]:grid-cols-1">
        <div className="border-r border-border px-8 py-7 max-[880px]:border-r-0 max-[880px]:border-b max-sm:px-4">
          <div className="kicker">Transfer balance</div>
          <h2 className="mb-[18px] text-[clamp(36px,4.4vw,60px)] leading-none font-semibold tracking-[-0.04em]">
            Net <span className={spend.net < 0 ? "text-bad" : "text-good"}>{fmtNet(spend.net)}</span>
          </h2>
          <p className="max-w-[50ch] text-[15px] leading-[1.55] tracking-[-0.005em] text-ink-2">{verdict}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-[18px] px-8 py-7 max-sm:px-4">
          <Stat label="Spent (permanent)" value={fmtTotal(spend.spent)} tone="bad" sub={`${spend.bought} signings`} />
          <Stat label="Received (permanent)" value={fmtTotal(spend.received)} tone="good" sub={`${spend.sold} departures`} />
          <Stat
            label="Loans in / out"
            value={
              <>
                {spend.loansIn} <span className="text-mute">/</span> {spend.loansOut}
              </>
            }
            sub="Temporary moves"
          />
          <Stat
            label="Avg fee / signing"
            value={spend.avgFee == null ? DASH : `€${spend.avgFee.toFixed(1)}m`}
            sub={`Across ${spend.bought} permanents`}
          />
        </div>
      </section>

      <Panel
        kicker="Multi-season"
        title="Net spend per season."
        legend={
          <>
            <LegendSwatch color="bad">Spent</LegendSwatch>
            <LegendSwatch color="good">Received</LegendSwatch>
            <span>Click a season to jump.</span>
          </>
        }
      >
        <ScrollArea>
          <div className="min-w-[560px]">
            <NetSpendChart data={trend} current={season} />
          </div>
        </ScrollArea>
      </Panel>

      <div className="mb-10 grid grid-cols-2 gap-6 max-[880px]:grid-cols-1">
        <PerformerTable season={season} title={performers.labels.top} note={performers.labels.note} rows={performers.top}
          metric={(p) => (performers.mode === "rating" ? <RatingChip r={p.rating} /> : `${p.goals} G`)} />
        <PerformerTable season={season} title={performers.labels.bottom} note={performers.labels.note} rows={performers.bottom}
          metric={(p) => (performers.mode === "rating" ? <RatingChip r={p.rating} /> : `${fmtMins(p.mins)}′`)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="default">
          <Link href={tabHref(season, "roster")}>Open roster →</Link>
        </Button>
        <Button asChild>
          <Link href={tabHref(season, "transfers")}>Transfer audit →</Link>
        </Button>
        <Button asChild>
          <Link href={tabHref(season, "spending")}>Spending trends →</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub: string; tone?: "good" | "bad" }) {
  return (
    <div>
      <div className="label-mono">{label}</div>
      <div className={cn("tnum mt-1 font-mono text-[26px] font-medium tracking-[-0.01em]", tone === "good" && "text-good", tone === "bad" && "text-bad")}>
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-mute">{sub}</div>
    </div>
  );
}

function PerformerTable({
  season,
  title,
  note,
  rows,
  metric,
}: {
  season: string;
  title: string;
  note: string;
  rows: PlayerSeason[];
  metric: (p: PlayerSeason) => React.ReactNode;
}) {
  return (
    <div className="border border-border">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-paper-2 px-4 py-3.5">
        <span className="label-mono">{title}</span>
        <span className="font-mono text-[11px] text-mute">{note}</span>
      </div>
      <ul>
        {rows.map((p) => (
          <li key={p.playerId} className="border-b border-border last:border-b-0">
            <Link
              href={`${tabHref(season, "roster")}#player=${encodeURIComponent(p.player)}`}
              className="flex min-h-(--row-h) items-center gap-3 px-3.5 max-sm:gap-2.5 hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
            >
              <span className="flex-1 truncate text-sm font-medium tracking-[-0.012em]">{p.player}</span>
              <span className="w-[70px] max-sm:w-auto"><PosTag pos={p.pos} /></span>
              <span className="tnum w-[100px] text-right font-mono text-[12.5px] whitespace-nowrap max-sm:w-auto">{metric(p)}</span>
              <span className="w-[70px] text-right font-mono text-[12.5px] whitespace-nowrap text-mute max-sm:w-auto">{p.apps} apps</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
