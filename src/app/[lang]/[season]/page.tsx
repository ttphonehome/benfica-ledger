import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDataset } from "@/data/load";
import { isLang } from "@/i18n/config";
import { getI18n } from "@/i18n";
import { performers, squadStats, windowVerdict } from "@/lib/stats/overview";
import { seasonSpending, spendingTotals } from "@/lib/stats/spending";
import { seasonsNewestFirst } from "@/lib/stats/seasons";
import { OverviewScreen } from "@/screens/overview/overview-screen";

export async function generateMetadata({ params }: PageProps<"/[lang]/[season]">): Promise<Metadata> {
  const { lang, season } = await params;
  if (!isLang(lang)) return {};
  const { t } = getI18n(lang);
  return { title: `${t("tab.overview")} ${season} · ${t("site.name")}` };
}

export default async function OverviewPage({ params }: PageProps<"/[lang]/[season]">) {
  const { lang, season } = await params;
  if (!isLang(lang)) notFound();
  const data = await getDataset();
  const rows = data.playerSeasons.filter((p) => p.season === season);
  const spend = seasonSpending(data.transfers, season);
  const trend = spendingTotals(data.transfers, seasonsNewestFirst(data)).seasons.map((s) => ({
    season: s.season,
    spent: Math.round(s.spent),
    received: Math.round(s.received),
    net: s.net,
  }));
  return (
    <OverviewScreen
      lang={lang}
      season={season}
      ctx={data.seasonContext.find((c) => c.season === season)}
      squad={squadStats(rows)}
      spend={spend}
      verdict={windowVerdict(spend)}
      trend={trend}
      performers={performers(rows)}
    />
  );
}
