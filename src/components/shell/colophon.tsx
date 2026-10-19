import type { DatasetMeta } from "@/data/schema";

export function Colophon({ meta }: { meta: DatasetMeta }) {
  const sourced = Object.values(meta.datasets).every((p) => p === "sourced");
  const updated = meta.generatedAt ? new Date(meta.generatedAt).toISOString().slice(0, 10) : null;
  return (
    <footer className="flex flex-wrap justify-between gap-3 border-t border-border px-(--pad) py-[22px] font-mono text-[10px] tracking-[0.12em] text-mute uppercase">
      <div>The Águia Ledger · Fan tool · Not affiliated with SL Benfica</div>
      <div>
        Data: {sourced ? "sourced" : "illustrative"}
        {updated ? ` · updated ${updated}` : " · not yet connected to a live source"}
      </div>
    </footer>
  );
}
