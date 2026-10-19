import type { DatasetMeta } from "@/data/schema";
import type { Lang } from "@/i18n/config";
import { getI18n } from "@/i18n";

// Stays visible until the selected season and every dataset come from a real
// source. Says what is wrong with the numbers on screen, not a generic warning.
export function DataNote({ lang, meta, season }: { lang: Lang; meta: DatasetMeta; season: string }) {
  const { t } = getI18n(lang);
  const s = meta.seasons[season];
  const unsourcedSets = Object.values(meta.datasets).some((p) => p !== "sourced");
  if (s?.status === "sourced" && !unsourcedSets) return null;

  // A sourced season can still sit next to hand-entered, unchecked datasets.
  const label = s?.status === "sourced" ? "partial" : (s?.status ?? "placeholder");
  const text = s?.status === "sourced" ? "note.partial" : s?.status === "partial" ? "note.wikipedia" : `note.${label}` as const;
  return (
    <div role="note" className="border-b border-border bg-paper-2 px-(--pad) py-2.5">
      <p className="mx-auto flex max-w-[1480px] flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11px] leading-relaxed text-ink-2">
        <span className="inline-flex items-center gap-2 tracking-[0.12em] text-foreground uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          {t(`note.label.${label}`)}
        </span>
        <span>
          {season}: {s ? t(text) : t("note.none")} {t("note.tail")}
        </span>
      </p>
    </div>
  );
}
