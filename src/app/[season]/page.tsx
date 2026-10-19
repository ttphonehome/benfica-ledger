import { NotBuilt } from "@/components/shell/not-built";

export default async function OverviewPage({ params }: PageProps<"/[season]">) {
  const { season } = await params;
  return <NotBuilt kicker={`Season Overview · ${season}`} title={`The ${season} ledger.`} />;
}
