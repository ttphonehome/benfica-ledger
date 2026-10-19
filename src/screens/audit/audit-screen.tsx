import type { AuditRow, AuditSummary } from "@/lib/stats/audit";
import { fmtMoney, fmtTotal } from "@/lib/format";
import { VerdictLine } from "@/components/common/panel";
import { AuditTable } from "./audit-table";
import { cn } from "@/lib/utils";

export function AuditScreen({
  season,
  ins,
  outs,
  summary,
  notes,
}: {
  season: string;
  ins: AuditRow[];
  outs: AuditRow[];
  summary: AuditSummary;
  notes: Record<string, string>;
}) {
  const s = summary;
  const count = (rows: AuditRow[], type: AuditRow["type"]) => rows.filter((r) => r.type === type).length;
  const noted = [...outs, ...ins].filter((r) => notes[r.playerId]).slice(0, 6);
  const usedOlderStats = outs.some((r) => r.statsSeason && r.statsSeason !== r.season);

  return (
    <div>
      <div className="kicker">Transfer Audit · {season}</div>
      <h1 className="section-h">Did we sell the right ones? Did we buy well?</h1>
      <p className="dek">
        Every move from the {season} window with the on-pitch context attached. Green flags signal value created; red flags
        signal value destroyed.
      </p>

      <VerdictLine>
        Sold <span className="font-mono">{s.soldCount} players</span> for{" "}
        <span className="font-mono text-good">{fmtTotal(s.totalOut)}</span>
        {s.avgOutRating != null && (
          <>
            {" "}at an average <span className="font-mono">{s.avgOutRating.toFixed(1)}</span> rating
          </>
        )}
        . Bought <span className="font-mono">{s.boughtCount}</span> for{" "}
        <span className="font-mono text-bad">{fmtTotal(s.totalIn)}</span>
        {s.avgInRating != null && (
          <>
            {" "}at an average <span className="font-mono">{s.avgInRating.toFixed(1)}</span> rating
          </>
        )}
        .
        <br />
        {s.tradeVerdict ? (
          <span className={cn(s.tradeVerdict.tone === "good" && "text-good", s.tradeVerdict.tone === "bad" && "text-bad")}>
            {s.tradeVerdict.text}
          </span>
        ) : (
          <span className="text-mute">No ratings on record for this window, so there is no quality verdict yet.</span>
        )}
      </VerdictLine>

      <div className="mb-7 grid grid-cols-2 border border-border max-[880px]:grid-cols-1">
        <AuditColumn
          label="Outgoings · Who left"
          total={fmtTotal(s.totalOut)}
          tone="good"
          sub={`${s.soldCount} sold · ${count(outs, "loan-out")} loaned · ${count(outs, "free")} free${s.undisclosedOut ? ` · ${s.undisclosedOut} fee${s.undisclosedOut === 1 ? "" : "s"} undisclosed` : ""}`}
        >
          <AuditTable rows={outs} kind="out" />
        </AuditColumn>
        <AuditColumn
          label="Incomings · Who arrived"
          total={fmtTotal(s.totalIn)}
          tone="bad"
          sub={`${s.boughtCount} bought · ${count(ins, "loan-in")} loaned · ${count(ins, "free")} free${s.undisclosedIn ? ` · ${s.undisclosedIn} fee${s.undisclosedIn === 1 ? "" : "s"} undisclosed` : ""}`}
          className="border-l border-border max-[880px]:border-t max-[880px]:border-l-0"
        >
          <AuditTable rows={ins} kind="in" />
        </AuditColumn>
      </div>
      {usedOlderStats && (
        <p className="-mt-4 mb-8 font-mono text-[11px] text-mute">
          Departures show apps and rating from the player&apos;s last season at the club. Fees count permanent deals only.
        </p>
      )}

      {noted.length > 0 && (
        <div className="mt-8">
          <div className="kicker">Editorial notes</div>
          <div className="grid grid-cols-2 gap-5 max-[880px]:grid-cols-1">
            {noted.map((r) => (
              <div key={r.id} className={cn("border-l-2 pl-3.5", r.dir === "in" ? "border-bad" : "border-good")}>
                <div className="label-mono">
                  {r.dir === "in" ? "Bought" : "Sold"} · {r.club} · {fmtMoney(r.fee)}
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
        <div className={cn("mt-0.5 text-[26px] font-semibold tracking-[-0.03em]", tone === "good" ? "text-good" : "text-bad")}>
          {total}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-mute">{sub}</div>
      </div>
      {children}
    </section>
  );
}
