import type { Metadata } from "next";
import { isLang } from "@/i18n/config";
import { getI18n } from "@/i18n";
import { getDataset } from "@/data/load";
import { formationAgg, managerAgg, playerTrust, seasonsNewest } from "@/lib/stats/managers";
import { ManagersScreen, type ManagerView } from "@/screens/managers/managers-screen";

export async function generateMetadata({ params }: PageProps<"/[lang]/[season]/managers">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const { t } = getI18n(lang);
  return { title: `${t("tab.managers")} · ${t("site.name")}` };
}

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
