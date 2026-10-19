import { redirect } from "next/navigation";
import { getDataset } from "@/data/load";
import { latestSeason } from "@/lib/stats/seasons";

// "/" opens the latest season. Browsers keep the #player= fragment across the
// redirect, so old-style deep links still land on the right player.
export default async function Home() {
  redirect(`/${latestSeason(await getDataset())}`);
}
