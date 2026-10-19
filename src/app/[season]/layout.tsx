import { notFound } from "next/navigation";
import { getDataset } from "@/data/load";
import { seasonsNewestFirst } from "@/lib/stats/seasons";
import { tabCounts } from "@/lib/stats/nav";
import { Masthead } from "@/components/shell/masthead";
import { Nav } from "@/components/shell/nav";
import { DataNote } from "@/components/shell/data-note";
import { Colophon } from "@/components/shell/colophon";
import { PlayerHashRouter } from "@/components/shell/player-hash-router";

export async function generateStaticParams() {
  return seasonsNewestFirst(await getDataset()).map((season) => ({ season }));
}

export default async function SeasonLayout({ children, params }: LayoutProps<"/[season]">) {
  const { season } = await params;
  const data = await getDataset();
  const seasons = seasonsNewestFirst(data);
  if (!seasons.includes(season)) notFound();

  // Compact index for #player= links: name, id and the seasons they played.
  const players = Object.values(
    data.playerSeasons.reduce<Record<string, { id: string; name: string; seasons: string[] }>>((acc, p) => {
      (acc[p.playerId] ??= { id: p.playerId, name: p.player, seasons: [] }).seasons.push(p.season);
      return acc;
    }, {}),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Masthead />
      <Nav season={season} seasons={seasons} counts={tabCounts(data, season)} />
      <DataNote meta={data.meta} season={season} />
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-(--pad) pt-8 pb-20">{children}</main>
      <Colophon meta={data.meta} />
      <PlayerHashRouter season={season} players={players} />
    </div>
  );
}
