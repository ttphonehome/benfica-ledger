import type { Metadata } from "next";
import { getDataset } from "@/data/load";
import { formationAgg, managerAgg, playerTrust, seasonsNewest } from "@/lib/stats/managers";
import { ManagersScreen, type ManagerView } from "@/screens/managers/managers-screen";

export const metadata: Metadata = { title: "Manager era · The Águia Ledger" };

export default async function ManagersPage() {
  const data = await getDataset();
  const asOf = data.meta.asOf;
  const managers: ManagerView[] = data.managers.map((m) => ({
    agg: managerAgg(m, asOf),
    appointed: m.appointed,
    departed: m.departed,
    seasons: seasonsNewest(m),
    formations: formationAgg(m.seasons),
    trust: playerTrust(data, m),
  }));
  return <ManagersScreen managers={managers} asOf={asOf} />;
}
