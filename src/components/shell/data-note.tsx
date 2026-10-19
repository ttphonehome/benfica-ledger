import type { DatasetMeta } from "@/data/schema";

// Stays visible until the selected season and every dataset come from a real
// source. Shows what is wrong with the numbers on screen, not a generic warning.
export function DataNote({ meta, season }: { meta: DatasetMeta; season: string }) {
  const s = meta.seasons[season];
  const unsourcedSets = Object.values(meta.datasets).some((p) => p !== "sourced");
  if (s?.status === "sourced" && !unsourcedSets) return null;

  const label = s?.status === "placeholder" ? "Illustrative data" : "Unverified data";
  return (
    <div role="note" className="border-b border-border bg-paper-2 px-(--pad) py-2.5">
      <p className="mx-auto flex max-w-[1480px] flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11px] leading-relaxed text-ink-2">
        <span className="inline-flex items-center gap-2 tracking-[0.12em] text-foreground uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          {label}
        </span>
        <span>
          {season}: {s?.note ?? "No provenance recorded for this season."} Not for citation until real data is loaded.
        </span>
      </p>
    </div>
  );
}
