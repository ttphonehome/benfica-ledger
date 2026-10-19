import type { Metadata } from "next";
import { getDataset } from "@/data/load";
import { presidentAgg, presidentSeasons } from "@/lib/stats/presidents";
import { PresidentsScreen, type PresidentView } from "@/screens/presidents/presidents-screen";

export const metadata: Metadata = { title: "Presidency era · The Águia Ledger" };

export default async function PresidentsPage() {
  const data = await getDataset();
  const asOf = data.meta.asOf;
  const presidents: PresidentView[] = data.presidents.map((p) => ({
    agg: presidentAgg(data, p, data.managers, asOf),
    appointed: p.appointed,
    departed: p.departed,
    notes: p.notes,
    seasons: presidentSeasons(data, p),
  }));
  // The window opens with the first season either president has on record.
  const first = data.presidents.flatMap((p) => p.seasons.map((s) => s.season)).sort()[0];
  const windowStart = `${first.slice(0, 4)}-06-01`;
  return <PresidentsScreen presidents={presidents} windowStart={windowStart} asOf={asOf} />;
}
