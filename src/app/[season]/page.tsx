import type { Metadata } from "next";
import { getDataset } from "@/data/load";
import { performers, squadStats, windowVerdict } from "@/lib/stats/overview";
import { seasonSpending, spendingTotals } from "@/lib/stats/spending";
import { seasonsNewestFirst } from "@/lib/stats/seasons";
import { OverviewScreen } from "@/screens/overview/overview-screen";

export async function generateMetadata({ params }: PageProps<"/[season]">): Promise<Metadata> {
  const { season } = await params;
  return { title: `${season} overview · The Águia Ledger` };
}

export default async function OverviewPage({ params }: PageProps<"/[season]">) {
  const { season } = await params;
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
