import { NotBuilt } from "@/components/shell/not-built";

export default async function TransfersPage({ params }: PageProps<"/[season]/transfers">) {
  const { season } = await params;
  return <NotBuilt kicker={`Transfer Audit · ${season}`} title="Did we sell the right ones? Did we buy well?" />;
}
