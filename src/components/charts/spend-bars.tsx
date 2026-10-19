import { fmtNet } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SpendBar {
  season: string;
  /** Whole €m, or null when there is no transfer data for the season. */
  spent: number | null;
  received: number | null;
  net: number | null;
}

// One row per season: spent bar, amount, received bar, net (".bar-row").
export function SpendBars({ rows, current, max }: { rows: SpendBar[]; current?: string; max: number }) {
  return (
    <div className="mt-3">
      {rows.map((r) => {
        const active = r.season === current;
        return (
          <div
            key={r.season}
            className={cn(
              "grid grid-cols-[80px_1fr_80px_1fr_100px] items-center gap-3 border-b border-border py-3 font-mono text-xs last:border-b-0 max-[880px]:grid-cols-[70px_1fr_70px]",
              active && "bg-paper-2",
            )}
          >
            <div className={cn(active && "font-semibold")}>{r.season}</div>
            {r.spent == null ? (
              <div className="col-span-4 text-mute max-[880px]:col-span-2">No transfer data for this season.</div>
            ) : (
              <>
                <Track pct={(r.spent / max) * 100} tone="bad" label={`Spent €${r.spent}m`} />
                <div className="text-right text-bad">−€{r.spent}m</div>
                <Track pct={((r.received ?? 0) / max) * 100} tone="good" label={`Received €${r.received}m`} />
                <div className={cn("text-right", (r.net ?? 0) < 0 ? "text-bad" : "text-good")}>net {fmtNet(r.net ?? 0)}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Track({ pct, tone, label }: { pct: number; tone: "good" | "bad"; label: string }) {
  return (
    <div className="flex h-[22px] items-center" role="img" aria-label={label}>
      <div
        className={cn("h-[22px] border-l-2", tone === "bad" ? "border-bad bg-bad-soft" : "border-good bg-good-soft")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
