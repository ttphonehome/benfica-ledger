"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerProfile, Transfer } from "@/data/schema";
import { DASH, fmtDay, fmtMins, fmtMoney, fmtRating } from "@/lib/format";
import { careerMetric, type PlayerHistory } from "@/lib/stats/roster";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<Transfer["type"], string> = {
  permanent: "Permanent",
  "loan-in": "Loan in",
  "loan-out": "Loan out",
  free: "Free transfer",
  "loan-end": "End of loan",
  "academy-promo": "Academy promotion",
};

function feeLabel(t: Transfer): string {
  switch (t.type) {
    case "free":
      return "Free";
    case "academy-promo":
      return "Academy";
    case "loan-in":
    case "loan-out":
      return "Loan";
    case "loan-end":
      return "Loan ended";
    default:
      return fmtMoney(t.fee);
  }
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="label-mono mb-3 font-medium">{children}</h3>;
}

// Compact key/value and grid tables inside the card.
const detailTable = "w-full border-collapse font-mono text-[12.5px] [&_td]:border-b [&_td]:border-border [&_td]:px-2 [&_td]:py-[7px] [&_td:first-child]:pl-0 [&_tr:last-child_td]:border-b-0";
const lbl = "text-mute";

export function PlayerCard({
  history,
  profile,
  note,
  currentSeason,
}: {
  history: PlayerHistory;
  profile?: PlayerProfile;
  note?: string;
  currentSeason: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const { seasons, arrivals, departures, injuries } = history;
  const last = seasons[seasons.length - 1];
  const metric = careerMetric(seasons);
  const maxMins = Math.max(1, ...seasons.map((s) => s.mins));

  const share = async () => {
    const url = `${location.origin}/${currentSeason}/roster#player=${encodeURIComponent(history.name)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked (http, iframes); the hash still updates below.
    }
    window.history.replaceState(null, "", `#player=${encodeURIComponent(history.name)}`);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  const meta = [
    profile
      ? `${profile.role} · ${profile.primary}${profile.secondary ? ` / ${profile.secondary}` : ""} · ${profile.foot}-foot`
      : last.pos,
    last.nat,
  ].filter(Boolean);

  return (
    <Tabs defaultValue="arc" className="grid grid-cols-1 gap-8 border-y border-rule-strong px-8 py-7 max-sm:px-4 md:grid-cols-2">
      <div className="col-span-full grid grid-cols-1 items-end gap-6 border-b border-border pb-[18px] md:grid-cols-[1fr_auto]">
        <div>
          <div className="text-[32px] leading-none font-semibold tracking-[-0.03em] whitespace-normal">{history.name}</div>
          <div className="mt-2 font-mono text-[11px] tracking-[0.1em] whitespace-normal text-mute uppercase">
            {meta.join(" · ")} · <span className={last.origin === "academy" ? "text-good" : undefined}>{last.origin}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="arc">Career Arc</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="injuries">Injuries</TabsTrigger>
          </TabsList>
          <Button variant="default" onClick={share} aria-live="polite">
            {copied ? "Copied ✓" : "Share"}
          </Button>
        </div>
      </div>

      <TabsContent value="arc" className="contents">
        <section>
          <H3>{metric === "rating" ? "Rating trajectory" : "Minutes per season"}</H3>
          <div className="mt-2.5 flex h-20 items-end gap-1 border-b border-border pb-1">
            {seasons.map((s) => {
              const h = metric === "rating" ? ((s.rating ?? 0) / 9) * 70 : (s.mins / maxMins) * 70;
              const val = metric === "rating" ? fmtRating(s.rating) : fmtMins(s.mins);
              return (
                <div key={s.season} className="flex max-w-14 flex-1 flex-col items-center gap-1">
                  <div className="font-mono text-[10px] text-foreground">{val}</div>
                  <div
                    className={cn("min-h-0.5 w-full", s.season === currentSeason ? "bg-foreground" : "bg-mute-2 opacity-40")}
                    style={{ height: `${h}px` }}
                  />
                  <div className="font-mono text-[9px] tracking-[0.05em] text-mute">{s.season.slice(2)}</div>
                </div>
              );
            })}
          </div>
          {metric === "mins" && (
            <p className="mt-2 font-mono text-[11px] text-mute">No ratings on record, so minutes are shown instead.</p>
          )}
          {note && (
            <p className="mt-5 border-l-2 border-foreground pl-3.5 text-sm leading-relaxed whitespace-normal text-ink-2">{note}</p>
          )}
        </section>
        <section>
          <H3>Season-by-season</H3>
          <table className={detailTable}>
            <thead>
              <tr className={lbl}>
                <td>Season</td>
                <td>Apps</td>
                <td>Min</td>
                <td>G</td>
                <td>A</td>
                <td>Rating</td>
                <td>Pos</td>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr key={s.season} className={s.season === currentSeason ? "bg-background" : undefined}>
                  <td>{s.season}</td>
                  <td>{s.apps}</td>
                  <td>
                    {fmtMins(s.mins)}
                    {s.minsEstimated && <span className="text-mute" title="Estimated from starts and sub appearances">*</span>}
                  </td>
                  <td>{s.goals}</td>
                  <td>{s.assists ?? DASH}</td>
                  <td>{fmtRating(s.rating)}</td>
                  <td>{s.pos}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {seasons.some((s) => s.minsEstimated) && (
            <p className="mt-2 font-mono text-[10px] text-mute">* Estimated: 85 per start, 25 per sub appearance.</p>
          )}
        </section>
      </TabsContent>

      <TabsContent value="transfers" className="contents">
        <section>
          <H3>Arrived</H3>
          <MoveList moves={arrivals} dir="in" empty="No record in this dataset." />
        </section>
        <section>
          <H3>Departed</H3>
          <MoveList
            moves={departures}
            dir="out"
            empty={last.status === "stay" ? "Still at the club." : "No departure on record in this dataset."}
          />
        </section>
      </TabsContent>

      <TabsContent value="injuries" className="col-span-full">
        <H3>Injury history</H3>
        {injuries.length === 0 ? (
          <p className="font-mono text-xs text-mute">No injuries on record across these seasons.</p>
        ) : (
          <div className="no-scrollbar overflow-x-auto">
            <table className={detailTable}>
              <thead>
                <tr className={lbl}>
                  <td>Season</td>
                  <td>Type</td>
                  <td>Out</td>
                  <td>Back</td>
                  <td>Weeks</td>
                  <td>Matches</td>
                  <td>Notes</td>
                </tr>
              </thead>
              <tbody>
                {injuries.map((i) => (
                  <tr key={i.id}>
                    <td>{i.season}</td>
                    <td>{i.type}</td>
                    <td>{fmtDay(i.out)}</td>
                    <td>{fmtDay(i.back)}</td>
                    <td className="text-bad">{i.weeks}</td>
                    <td>{i.matches}</td>
                    <td className="text-[11px] whitespace-normal text-mute">{i.notes ?? DASH}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function MoveList({ moves, dir, empty }: { moves: Transfer[]; dir: "in" | "out"; empty: string }) {
  if (!moves.length) return <p className="font-mono text-xs text-mute">{empty}</p>;
  return (
    <div className="space-y-5">
      {moves.map((t) => (
        <table key={t.id} className={detailTable}>
          <tbody>
            <tr>
              <td className={lbl}>Season</td>
              <td>{t.season}</td>
            </tr>
            <tr>
              <td className={lbl}>{dir === "in" ? "From" : "To"}</td>
              <td>{t.club}</td>
            </tr>
            <tr>
              <td className={lbl}>Fee</td>
              <td>{feeLabel(t)}</td>
            </tr>
            <tr>
              <td className={lbl}>Type</td>
              <td>{TYPE_LABEL[t.type]}</td>
            </tr>
            {dir === "in" && (
              <tr>
                <td className={lbl}>Age</td>
                <td>{t.age ?? DASH}</td>
              </tr>
            )}
          </tbody>
        </table>
      ))}
    </div>
  );
}
