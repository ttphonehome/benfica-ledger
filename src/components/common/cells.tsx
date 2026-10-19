"use client";

import type { Position } from "@/data/schema";
import { DASH } from "@/i18n/format";
import { useI18n } from "@/i18n/client";
import { ratingBand } from "@/lib/stats/rating";
import { cn } from "@/lib/utils";

export function RatingChip({ r }: { r: number | null }) {
  const { f } = useI18n();
  if (r == null) return <span className="font-mono text-mute">{DASH}</span>;
  const band = ratingBand(r);
  return (
    <span
      className={cn(
        "inline-block min-w-[42px] px-2 py-0.5 text-center font-mono text-[13px]",
        band === "hi" && "bg-good-soft text-good",
        band === "mid" && "text-foreground",
        band === "lo" && "bg-bad-soft text-bad",
      )}
    >
      {f.rating(r)}
    </span>
  );
}

export function PosTag({ pos }: { pos: Position | null }) {
  const { f } = useI18n();
  if (pos == null) return <span className="font-mono text-[11px] text-mute">{DASH}</span>;
  return (
    <span className="font-mono text-[11px] tracking-[0.06em] text-mute">
      <span className="text-foreground">{f.pos(pos)}</span>
      {f.group(pos) !== f.pos(pos) && <span className="ml-1.5 opacity-60">{f.group(pos)}</span>}
    </span>
  );
}

export function Faint({ children = DASH }: { children?: React.ReactNode }) {
  return <span className="text-mute">{children}</span>;
}
