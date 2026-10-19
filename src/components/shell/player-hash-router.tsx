"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/i18n/client";

type PlayerIndex = { id: string; name: string; seasons: string[] }[];

export function parsePlayerHash(hash: string): string | null {
  const m = /(?:^#|&)player=([^&]+)/.exec(hash);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

// Handles #player=<name or id> on any page: opens the Roster for a season the
// player appears in (the current one if possible, else their latest) and
// leaves the hash in place for the Roster to expand that player.
export function PlayerHashRouter({ season, players }: { season: string; players: PlayerIndex }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useI18n();

  useEffect(() => {
    const go = () => {
      const key = parsePlayerHash(window.location.hash);
      if (!key) return;
      const p = players.find((x) => x.name === key || x.id === key);
      if (!p) return;
      const target = p.seasons.includes(season) ? season : [...p.seasons].sort().at(-1)!;
      const path = `/${lang}/${target}/roster`;
      if (pathname !== path) router.replace(`${path}#player=${encodeURIComponent(p.name)}`);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [lang, pathname, players, router, season]);

  return null;
}
