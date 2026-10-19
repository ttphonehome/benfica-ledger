import type { DatasetMeta } from "@/data/schema";
import type { Lang } from "@/i18n/config";
import { getI18n } from "@/i18n";
import type { Coverage } from "@/lib/stats/coverage";

export function Colophon({ lang, meta, coverage }: { lang: Lang; meta: DatasetMeta; coverage: Coverage }) {
  const { t, f } = getI18n(lang);
  const sourced = Object.values(meta.datasets).every((p) => p === "sourced");
  const c = coverage;
  return (
    <footer className="flex flex-wrap justify-between gap-3 border-t border-border px-(--pad) py-[22px] font-mono text-[10px] tracking-[0.12em] text-mute uppercase">
      <div>{t("footer.left")}</div>
      <div>
        {t("footer.covers", { from: c.covered[0] ?? "—", to: c.covered.at(-1) ?? "—", n: c.covered.length, total: c.target.length })}
        {c.missing.length > 0 && t("footer.missing", { from: c.missing[0], to: c.missing.at(-1)! })}
      </div>
      <div>
        {t(sourced ? "footer.sourced" : "footer.illustrative")}
        {meta.generatedAt ? t("footer.updated", { date: f.day(meta.generatedAt.slice(0, 10)) }) : t("footer.notConnected")}
        {meta.generatedAt && <div className="mt-1">{t("footer.credits")}</div>}
      </div>
    </footer>
  );
}
