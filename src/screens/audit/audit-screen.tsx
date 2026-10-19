import type { Lang } from "@/i18n/config";
import { getI18n } from "@/i18n";
import type { AuditRow, AuditSummary } from "@/lib/stats/audit";
import { VerdictLine } from "@/components/common/panel";
import { AuditTable } from "./audit-table";
import { cn } from "@/lib/utils";

export function AuditScreen({
  lang,
  season,
  ins,
  outs,
  summary,
  notes,
}: {
  lang: Lang;
  season: string;
  ins: AuditRow[];
  outs: AuditRow[];
  summary: AuditSummary;
  notes: Record<string, string>;
}) {
  const { t, f } = getI18n(lang);
  const s = summary;
  const count = (rows: AuditRow[], type: AuditRow["type"]) => rows.filter((r) => r.type === type).length;
  const noted = [...outs, ...ins].filter((r) => notes[r.playerId]).slice(0, 6);
  const usedOlderStats = outs.some((r) => r.statsSeason && r.statsSeason !== r.season);
  const undisclosed = (n: number) => (n ? t("audit.undisclosed", { n }) : "");

  return (
    <div>
      <div className="kicker">{t("audit.kicker", { season })}</div>
      <h1 className="section-h">{t("audit.title")}</h1>
      <p className="dek">{t("audit.dek", { season })}</p>

      <VerdictLine>
        <Money text={t("audit.sold", { n: s.soldCount, total: "§" })} amount={f.total(s.totalOut)} tone="good" />
        {s.avgOutRating != null && t("audit.atAvg", { r: f.num(s.avgOutRating, 1) })}
        {". "}
        <Money text={t("audit.bought", { n: s.boughtCount, total: "§" })} amount={f.total(s.totalIn)} tone="bad" />
        {s.avgInRating != null && t("audit.atAvg", { r: f.num(s.avgInRating, 1) })}
        .
        <br />
        {s.tradeVerdict ? (
          <span className={cn(s.tradeVerdict.tone === "good" && "text-good", s.tradeVerdict.tone === "bad" && "text-bad")}>
            {t(s.tradeVerdict.key)}
          </span>
        ) : (
          <span className="text-mute">{t("audit.noQuality")}</span>
        )}
      </VerdictLine>

      <div className="mb-7 grid grid-cols-2 border border-border max-[880px]:grid-cols-1">
        <AuditColumn
          label={t("audit.outgoings")}
          total={f.total(s.totalOut)}
          tone="good"
          sub={t("audit.outSub", { a: s.soldCount, b: count(outs, "loan-out"), c: count(outs, "free") }) + undisclosed(s.undisclosedOut)}
        >
          <AuditTable rows={outs} kind="out" />
        </AuditColumn>
        <AuditColumn
          label={t("audit.incomings")}
          total={f.total(s.totalIn)}
          tone="bad"
          sub={t("audit.inSub", { a: s.boughtCount, b: count(ins, "loan-in"), c: count(ins, "free") }) + undisclosed(s.undisclosedIn)}
          className="border-l border-border max-[880px]:border-t max-[880px]:border-l-0"
        >
          <AuditTable rows={ins} kind="in" />
        </AuditColumn>
      </div>
      {usedOlderStats && <p className="-mt-4 mb-8 font-mono text-[11px] text-mute">{t("audit.footnote")}</p>}

      {noted.length > 0 && (
        <div className="mt-8">
          <div className="kicker">{t("audit.notes")}</div>
          <div className="grid grid-cols-2 gap-5 max-[880px]:grid-cols-1">
            {noted.map((r) => (
              <div key={r.id} className={cn("border-l-2 pl-3.5", r.dir === "in" ? "border-bad" : "border-good")}>
                <div className="label-mono">
                  {r.dir === "in" ? t("audit.boughtLabel") : t("audit.soldLabel")} · {r.club} · {f.money(r.fee)}
                </div>
                <div className="mt-1 text-[17px] font-medium tracking-[-0.02em]">{r.player}</div>
                <div className="mt-1.5 text-sm leading-[1.55] text-ink-2">{notes[r.playerId]}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders a sentence with the amount (marked §) highlighted in mono. */
function Money({ text, amount, tone }: { text: string; amount: string; tone: "good" | "bad" }) {
  const [before, after] = text.split("§");
  return (
    <>
      {before}
      <span className={cn("font-mono", tone === "good" ? "text-good" : "text-bad")}>{amount}</span>
      {after}
    </>
  );
}

function AuditColumn({
  label,
  total,
  tone,
  sub,
  children,
  className,
}: {
  label: string;
  total: string;
  tone: "good" | "bad";
  sub: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col", className)}>
      <div className="border-b border-border bg-paper-2 px-5 pt-[18px] pb-3.5">
        <h2 className="font-mono text-[10px] tracking-[0.14em] text-mute uppercase">{label}</h2>
        <div className={cn("mt-0.5 text-[26px] font-semibold tracking-[-0.03em]", tone === "good" ? "text-good" : "text-bad")}>{total}</div>
        <div className="mt-0.5 font-mono text-[11px] text-mute">{sub}</div>
      </div>
      {children}
    </section>
  );
}
