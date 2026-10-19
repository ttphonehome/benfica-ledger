"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TABS, tabFromPath, tabHref, type TabId } from "@/lib/stats/nav";
import { useI18n } from "@/i18n/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function Nav({
  season,
  seasons,
  counts,
}: {
  season: string;
  seasons: string[];
  counts: Partial<Record<TabId, number>>;
}) {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const active = tabFromPath(pathname);
  const [stuck, setStuck] = useState(false);

  // Stronger shadow once the masthead has scrolled away.
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label={t("nav.aria")}
      className={cn(
        "sticky top-0 z-25 flex items-stretch border-b border-border bg-background px-(--pad) transition-[box-shadow,border-color] duration-200",
        stuck && "border-rule-strong shadow-[0_1px_0_var(--rule-strong),0_6px_14px_-6px_rgba(0,0,0,0.55)]",
      )}
    >
      <div className="no-scrollbar flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        {TABS.map((tab) => {
          const current = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tabHref(lang, season, tab.id)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "relative mr-1 inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent px-[18px] pt-3.5 pb-3 text-[13px] tracking-[0.02em] whitespace-nowrap text-mute transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                current && "border-primary font-medium text-foreground",
              )}
            >
              {t(tab.label)}
              {tab.id !== "overview" && counts[tab.id] != null && (
                <span className="font-mono text-[10px] text-mute-2">{counts[tab.id]}</span>
              )}
            </Link>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center border-l border-border pl-4">
        <Select value={season} onValueChange={(s) => router.push(tabHref(lang, s, active), { scroll: false })}>
          <SelectTrigger aria-label={t("nav.season")} className="w-[97px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {seasons.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
}
