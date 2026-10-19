import { redirect } from "next/navigation";
import { getDataset } from "@/data/load";
import { latestSeason } from "@/lib/stats/seasons";

// /pt and /en open the latest season. Browsers keep the #player= fragment
// across the redirect, so deep links still land on the right player.
export default async function LangHome({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  redirect(`/${lang}/${latestSeason(await getDataset())}`);
}
