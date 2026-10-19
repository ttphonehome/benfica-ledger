import type { Metadata } from "next";
import { getDataset } from "@/data/load";
import { playerHistory, rosterRows, type PlayerHistory } from "@/lib/stats/roster";
import { RosterScreen } from "@/screens/roster/roster-screen";

export async function generateMetadata({ params }: PageProps<"/[season]/roster">): Promise<Metadata> {
  const { season } = await params;
  return { title: `Roster ${season} · The Águia Ledger` };
}

export default async function RosterPage({ params }: PageProps<"/[season]/roster">) {
  const { season } = await params;
  const data = await getDataset();
  const rows = rosterRows(data, season);
  const ids = rows.map((r) => r.playerId);

  // Only what this season's cards need is sent to the browser.
  const histories: Record<string, PlayerHistory> = {};
  for (const id of ids) {
    const h = playerHistory(data, id);
    if (h) histories[id] = h;
  }
  const profiles = Object.fromEntries(data.profiles.filter((p) => ids.includes(p.playerId)).map((p) => [p.playerId, p]));
  const notes = Object.fromEntries(data.notes.filter((n) => ids.includes(n.playerId)).map((n) => [n.playerId, n.text]));

  return <RosterScreen season={season} rows={rows} histories={histories} profiles={profiles} notes={notes} />;
}
