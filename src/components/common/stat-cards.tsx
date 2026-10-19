import { cn } from "@/lib/utils";

// Bordered row of big-number cards (".manager-stats" / ".pres-stats").
export function StatCards({ children, cols }: { children: React.ReactNode; cols: 4 | 5 }) {
  return (
    <div
      className={cn(
        "mb-7 grid border border-border max-[880px]:grid-cols-2 [&>*]:border-r [&>*]:border-border [&>*:last-child]:border-r-0 max-[880px]:[&>*]:border-b",
        cols === 4 ? "grid-cols-4" : "grid-cols-5",
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, big, sub, bigClassName }: { label: string; big: React.ReactNode; sub: React.ReactNode; bigClassName?: string }) {
  return (
    <div className="px-[22px] py-5">
      <div className="label-mono mb-2">{label}</div>
      <div className={cn("text-[32px] leading-none font-semibold tracking-[-0.035em]", bigClassName)}>{big}</div>
      <div className="mt-2 font-mono text-[11px] leading-[1.4] text-mute">{sub}</div>
    </div>
  );
}

export function Sep() {
  return <span className="mx-0.5 font-normal text-mute-2">–</span>;
}

export function Suffix({ children }: { children: React.ReactNode }) {
  return <span className="ml-1.5 text-[13px] font-normal tracking-normal text-mute">{children}</span>;
}

export function RecordBig({ w, d, l }: { w: number; d: number; l: number }) {
  return (
    <>
      {w}
      <Sep />
      {d}
      <Sep />
      {l}
    </>
  );
}
