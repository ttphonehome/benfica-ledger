import { cn } from "@/lib/utils";

// The bordered row of headline numbers at the top of a screen.
export function HeadStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mb-8 grid grid-cols-5 border-y border-border max-[880px]:grid-cols-2 [&>*]:border-r [&>*]:border-border [&>*:last-child]:border-r-0 max-[880px]:[&>*]:border-b max-[880px]:[&>*]:border-r",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function HeadCell({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="px-4 py-3.5">
      <div className="label-mono mb-1">{label}</div>
      <div className={cn("text-[22px] leading-[1.15] font-medium tracking-[-0.02em]", mono && "tnum font-mono text-lg")}>
        {value}
      </div>
    </div>
  );
}
