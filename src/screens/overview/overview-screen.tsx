import Link from "next/link";
import type { PlayerSeason, SeasonContext } from "@/data/schema";
import type { Lang } from "@/i18n/config";
import { getI18n, type I18n } from "@/i18n";
import { DASH } from "@/i18n/format";
import { finishText } from "@/i18n/season";
import type { DictKey } from "@/i18n/dictionaries/en";
import type { Performers, SquadStats } from "@/lib/stats/overview";
import type { SeasonSpending } from "@/lib/stats/spending";
import { tabHref } from "@/lib/stats/nav";
import { HeadCell, HeadStrip } from "@/components/common/head-strip";
import { LegendSwatch, Panel } from "@/components/common/panel";
import { PosTag, RatingChip } from "@/components/common/cells";
import { NetSpendChart, type NetSpendPoint } from "@/components/charts/net-spend-chart";
import { ScrollArea } from "@/components/data-table/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OverviewScreen({
  lang,
  season,
  ctx,
  squad,
  spend,
  verdict,
  trend,
  performers,
}: {
  lang: Lang;
  season: string;
  ctx: SeasonContext | undefined;
  squad: SquadStats;
  spend: SeasonSpending;
  verdict: DictKey;
  trend: NetSpendPoint[];
  performers: Performers;
}) {
  const i18n = getI18n(lang);
  const { t, f } = i18n;
  return (
    <div>
      <div className="kicker">{t("overview.kicker", { season })}</div>
      <h1 className="section-h">{t("overview.title", { season })}</h1>
      {ctx && (
        <p className="dek">
          {t("overview.dek", {
            finish: finishText(ctx, i18n),
            points: ctx.points ?? DASH,
            gf: ctx.goalsFor ?? DASH,
            ga: ctx.goalsAgainst ?? DASH,
            competitions: ctx.competitions,
            manager: ctx.manager,
          })}
        </p>
      )}

      <HeadStrip>
        <HeadCell label={t("overview.squad")} value={squad.squadSize} mono />
        <HeadCell label={t("overview.academyShare")} value={f.pct(squad.academySharePct)} mono />
        <HeadCell label={t("overview.academyMins")} value={f.pct(squad.academyMinutesPct)} mono />
        <HeadCell label={t("overview.avgRating")} value={squad.avgRating != null ? f.num(squad.avgRating, 2) : DASH} mono />
        <HeadCell label={t("overview.leagueFinish")} value={ctx?.leaguePosition != null ? f.ordinal(ctx.leaguePosition) : DASH} />
      </HeadStrip>

      <section className="mb-10 grid grid-cols-[1.4fr_1fr] border border-border bg-paper-2 max-[880px]:grid-cols-1">
        <div className="border-r border-border px-8 py-7 max-[880px]:border-r-0 max-[880px]:border-b max-sm:px-4">
          <div className="kicker">{t("overview.balance")}</div>
          <h2 className="mb-[18px] text-[clamp(36px,4.4vw,60px)] leading-none font-semibold tracking-[-0.04em]">
            {t("overview.net")} <span className={spend.net < 0 ? "text-bad" : "text-good"}>{f.net(spend.net)}</span>
          </h2>
          <p className="max-w-[50ch] text-[15px] leading-[1.55] tracking-[-0.005em] text-ink-2">{t(verdict)}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-[18px] px-8 py-7 max-sm:px-4">
          <Stat label={t("overview.spentPerm")} value={f.total(spend.spent)} tone="bad" sub={t("overview.signings", { n: spend.bought })} />
          <Stat label={t("overview.receivedPerm")} value={f.total(spend.received)} tone="good" sub={t("overview.departures", { n: spend.sold })} />
          <Stat
            label={t("overview.loans")}
            value={
              <>
                {spend.loansIn} <span className="text-mute">/</span> {spend.loansOut}
              </>
            }
            sub={t("overview.temporary")}
          />
          <Stat
            label={t("overview.avgFee")}
            value={spend.avgFee == null ? DASH : f.money1(spend.avgFee)}
            sub={t("overview.across", { n: spend.bought - spend.undisclosedIn })}
          />
        </div>
      </section>

      <Panel
        kicker={t("overview.multi")}
        title={t("overview.netPerSeason")}
        legend={
          <>
            <LegendSwatch color="bad">{t("legend.spent")}</LegendSwatch>
            <LegendSwatch color="good">{t("legend.received")}</LegendSwatch>
            <span>{t("overview.clickJump")}</span>
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
        <PerformerTable i18n={i18n} season={season} title={t(performers.labels.top)} note={t(performers.labels.note)} rows={performers.top}
          metric={(p) => (performers.mode === "rating" ? <RatingChip r={p.rating} /> : t("overview.goalsShort", { n: p.goals }))} />
        <PerformerTable i18n={i18n} season={season} title={t(performers.labels.bottom)} note={t(performers.labels.note)} rows={performers.bottom}
          metric={(p) => (performers.mode === "rating" ? <RatingChip r={p.rating} /> : `${f.mins(p.mins)}′`)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="default">
          <Link href={tabHref(lang, season, "roster")}>{t("overview.openRoster")}</Link>
        </Button>
        <Button asChild>
          <Link href={tabHref(lang, season, "transfers")}>{t("overview.toAudit")}</Link>
        </Button>
        <Button asChild>
          <Link href={tabHref(lang, season, "spending")}>{t("overview.toSpending")}</Link>
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
  i18n,
  season,
  title,
  note,
  rows,
  metric,
}: {
  i18n: I18n;
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
              href={`${tabHref(i18n.lang, season, "roster")}#player=${encodeURIComponent(p.player)}`}
              className="flex min-h-(--row-h) items-center gap-3 px-3.5 hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset max-sm:gap-2.5"
            >
              <span className="flex-1 truncate text-sm font-medium tracking-[-0.012em]">{p.player}</span>
              <span className="w-[70px] max-sm:w-auto"><PosTag pos={p.pos} /></span>
              <span className="tnum w-[100px] text-right font-mono text-[12.5px] whitespace-nowrap max-sm:w-auto">{metric(p)}</span>
              <span className="w-[76px] text-right font-mono text-[12.5px] whitespace-nowrap text-mute max-sm:w-auto">{i18n.tp("apps", p.apps)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
