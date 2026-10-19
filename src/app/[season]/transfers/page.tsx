import type { Metadata } from "next";
import { getDataset } from "@/data/load";
import { auditRows, auditSummary } from "@/lib/stats/audit";
import { AuditScreen } from "@/screens/audit/audit-screen";

export async function generateMetadata({ params }: PageProps<"/[season]/transfers">): Promise<Metadata> {
  const { season } = await params;
  return { title: `Transfer audit ${season} · The Águia Ledger` };
}

export default async function TransfersPage({ params }: PageProps<"/[season]/transfers">) {
  const { season } = await params;
  const data = await getDataset();
  const { ins, outs } = auditRows(data, season);
  const ids = new Set([...ins, ...outs].map((r) => r.playerId));
  const notes = Object.fromEntries(data.notes.filter((n) => ids.has(n.playerId)).map((n) => [n.playerId, n.text]));
  return <AuditScreen season={season} ins={ins} outs={outs} summary={auditSummary(ins, outs)} notes={notes} />;
}
