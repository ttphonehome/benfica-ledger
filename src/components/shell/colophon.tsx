import type { DatasetMeta } from "@/data/schema";
import type { Coverage } from "@/lib/stats/coverage";

export function Colophon({ meta, coverage }: { meta: DatasetMeta; coverage: Coverage }) {
  const sourced = Object.values(meta.datasets).every((p) => p === "sourced");
  const updated = meta.generatedAt ? new Date(meta.generatedAt).toISOString().slice(0, 10) : null;
  return (
    <footer className="flex flex-wrap justify-between gap-3 border-t border-border px-(--pad) py-[22px] font-mono text-[10px] tracking-[0.12em] text-mute uppercase">
      <div>The Águia Ledger · Fan tool · Not affiliated with SL Benfica</div>
      <div>
        Covers {coverage.covered[0]} to {coverage.covered.at(-1)} · {coverage.covered.length} of {coverage.target.length} target seasons
        {coverage.missing.length > 0 && ` · missing ${coverage.missing[0]} to ${coverage.missing.at(-1)}`}
      </div>
      <div>
        Data: {sourced ? "sourced" : "illustrative"}
        {updated ? ` · updated ${updated}` : " · not yet connected to a live source"}
      </div>
    </footer>
  );
}
