import type { Metadata } from "next";
import { getDataset } from "@/data/load";
import { seasonsNewestFirst } from "@/lib/stats/seasons";
import { spendingTotals } from "@/lib/stats/spending";
import { SpendingScreen } from "@/screens/spending/spending-screen";

export const metadata: Metadata = { title: "Spending trends · The Águia Ledger" };

export default async function SpendingPage({ params }: PageProps<"/[season]/spending">) {
  const { season } = await params;
  const data = await getDataset();
  return (
    <SpendingScreen
      season={season}
      totals={spendingTotals(data.transfers, seasonsNewestFirst(data))}
      context={Object.fromEntries(data.seasonContext.map((c) => [c.season, c]))}
    />
  );
}
