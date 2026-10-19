import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDataset } from "@/data/load";
import { isLang } from "@/i18n/config";
import { getI18n } from "@/i18n";
import { seasonsNewestFirst } from "@/lib/stats/seasons";
import { spendingTotals } from "@/lib/stats/spending";
import { SpendingScreen } from "@/screens/spending/spending-screen";

export async function generateMetadata({ params }: PageProps<"/[lang]/[season]/spending">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const { t } = getI18n(lang);
  return { title: `${t("tab.spending")} · ${t("site.name")}` };
}

export default async function SpendingPage({ params }: PageProps<"/[lang]/[season]/spending">) {
  const { lang, season } = await params;
  if (!isLang(lang)) notFound();
  const data = await getDataset();
  return (
    <SpendingScreen
      lang={lang}
      season={season}
      totals={spendingTotals(data.transfers, seasonsNewestFirst(data))}
      context={Object.fromEntries(data.seasonContext.map((c) => [c.season, c]))}
    />
  );
}
