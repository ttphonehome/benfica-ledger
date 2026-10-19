import { cn } from "@/lib/utils";

// Bordered block with a kicker + title row and an optional legend (".trend").
export function Panel({
  kicker,
  title,
  legend,
  children,
  className,
}: {
  kicker: string;
  title: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-10 border border-border px-7 py-6 max-sm:px-4", className)}>
      <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <div className="kicker">{kicker}</div>
          <h2 className="text-xl font-semibold tracking-[-0.025em]">{title}</h2>
        </div>
        {legend && <div className="flex flex-wrap gap-4 font-mono text-[11px] text-mute">{legend}</div>}
      </div>
      {children}
    </section>
  );
}

export function LegendSwatch({ color, children }: { color: "good" | "bad"; children: React.ReactNode }) {
  return (
    <span>
      <span className={cn("mr-1.5 inline-block size-2.5 align-[-1px]", color === "good" ? "bg-good" : "bg-bad")} />
      {children}
    </span>
  );
}

// Bordered sentence with highlighted numbers (".verdict-line").
export function VerdictLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-7 border border-border bg-paper-2 px-[22px] py-[18px] text-base leading-normal tracking-[-0.012em]", className)}>
      {children}
    </div>
  );
}

// Left-ruled editorial aside (".ms-aside").
export function Aside({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mt-[22px] border-l-2 border-foreground bg-paper-2 px-[18px] py-3.5 text-sm leading-normal text-ink-2", className)}>
      {children}
    </div>
  );
}
