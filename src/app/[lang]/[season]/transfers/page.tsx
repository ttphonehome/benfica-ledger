import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDataset } from "@/data/load";
import { isLang } from "@/i18n/config";
import { getI18n } from "@/i18n";
import { auditRows, auditSummary } from "@/lib/stats/audit";
import { AuditScreen } from "@/screens/audit/audit-screen";

export async function generateMetadata({ params }: PageProps<"/[lang]/[season]/transfers">): Promise<Metadata> {
  const { lang, season } = await params;
  if (!isLang(lang)) return {};
  const { t } = getI18n(lang);
  return { title: `${t("tab.transfers")} ${season} · ${t("site.name")}` };
}

export default async function TransfersPage({ params }: PageProps<"/[lang]/[season]/transfers">) {
  const { lang, season } = await params;
  if (!isLang(lang)) notFound();
  const data = await getDataset();
  const { ins, outs } = auditRows(data, season);
  const ids = new Set([...ins, ...outs].map((r) => r.playerId));
  const notes = Object.fromEntries(data.notes.filter((n) => ids.has(n.playerId)).map((n) => [n.playerId, n.text]));
  return <AuditScreen lang={lang} season={season} ins={ins} outs={outs} summary={auditSummary(ins, outs)} notes={notes} />;
}
