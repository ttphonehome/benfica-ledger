import type { Position } from "@/data/schema";
import { DASH, ratingBand } from "@/lib/format";
import { positionGroup } from "@/lib/stats/positions";
import { cn } from "@/lib/utils";

export function RatingChip({ r }: { r: number | null }) {
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
      {r.toFixed(1)}
    </span>
  );
}

export function PosTag({ pos }: { pos: Position }) {
  return (
    <span className="font-mono text-[11px] tracking-[0.06em] text-mute">
      <span className="text-foreground">{pos}</span>
      <span className="ml-1.5 opacity-60">{positionGroup(pos)}</span>
    </span>
  );
}

export function Faint({ children = DASH }: { children?: React.ReactNode }) {
  return <span className="text-mute">{children}</span>;
}
