"use client";

import { axisPct } from "@/lib/dates";
import { useScrollIntoViewX } from "@/hooks/use-scroll-into-view-x";
import { useI18n } from "@/i18n/client";
import { ScrollArea } from "@/components/data-table/scroll-area";
import { cn } from "@/lib/utils";

export interface TenureBar {
  id: string;
  label: string;
  /** Extra muted text after the label, e.g. "since 2003". */
  suffix?: string;
  start: string;
  end: string | null;
  titles: number;
  tooltip: string;
}

// Gantt-style strip of tenures on a year axis ending at "now" (the data's
// as-of date). Bars are buttons: clicking one selects that person.
export function TenureTimeline({
  bars,
  start,
  asOf,
  selected,
  onSelect,
}: {
  bars: TenureBar[];
  start: string;
  asOf: string;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const selectedRef = useScrollIntoViewX<HTMLButtonElement>(selected);
  const { t } = useI18n();
  const x = (d: string) => axisPct(d < start ? start : d, start, asOf);
  const years: number[] = [];
  for (let y = Number(start.slice(0, 4)) + (start.slice(5) === "01-01" ? 0 : 1); y <= Number(asOf.slice(0, 4)); y++) years.push(y);

  return (
    <div className="border border-border">
      <ScrollArea>
        <div className="min-w-[720px] px-8 pt-[22px] pb-[26px]">
          <div className="relative mb-3 h-[22px] border-b border-border" aria-hidden>
            {years.map((y) => (
              <Tick key={y} left={x(`${y}-01-01`)} label={String(y)} />
            ))}
            <Tick left={100} label={t("timeline.now")} now />
          </div>
          <div className="relative h-[46px] touch:h-[60px]">
            {bars.map((b) => {
              const x0 = x(b.start);
              const x1 = x(b.end ?? asOf);
              const sel = b.id === selected;
              const now = b.end == null;
              return (
                <button
                  key={b.id}
                  ref={sel ? selectedRef : undefined}
                  type="button"
                  aria-pressed={sel}
                  title={b.tooltip}
                  onClick={() => onSelect(b.id)}
                  style={{ left: `${x0}%`, width: `${Math.max(2, x1 - x0)}%` }}
                  className={cn(
                    "absolute top-2 flex h-[30px] items-center touch:h-11 justify-between gap-2.5 overflow-hidden border border-rule-strong bg-white/6 px-3 text-left transition-colors hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    now && "border-l-[3px] border-primary",
                    sel && "border-foreground bg-foreground text-background hover:bg-foreground",
                    sel && now && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  <span className="truncate text-[11px] font-medium tracking-[-0.015em]">
                    {b.label}
                    {b.suffix && <span className="ml-1.5 font-mono text-[9px] opacity-70">{b.suffix}</span>}
                  </span>
                  {b.titles > 0 && <span className="shrink-0 font-mono text-[10px] tracking-[0.04em] opacity-85">★ {b.titles}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function Tick({ left, label, now }: { left: number; label: string; now?: boolean }) {
  return (
    <div
      className={cn("absolute top-0 -translate-x-1/2 font-mono text-[10px]", now ? "font-medium text-primary" : "text-mute")}
      style={{ left: `${left}%` }}
    >
      {label}
      <span className={cn("mx-auto mt-1 block h-2 w-px", now ? "bg-primary" : "bg-border")} />
    </div>
  );
}
