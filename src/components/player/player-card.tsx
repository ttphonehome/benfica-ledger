"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerProfile, Transfer } from "@/data/schema";
import { DASH } from "@/i18n/format";
import { useI18n } from "@/i18n/client";
import type { I18n } from "@/i18n";
import { careerMetric, type PlayerHistory } from "@/lib/stats/roster";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function feeLabel(tr: Transfer, { t, f }: I18n): string {
  switch (tr.type) {
    case "free":
      return t("fee.free");
    case "academy-promo":
      return t("fee.academy");
    case "loan-in":
    case "loan-out":
      return t("fee.loan");
    case "loan-end":
      return t("fee.loanEnded");
    default:
      return tr.fee == null ? t("fee.undisclosed") : f.money(tr.fee);
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
  const i18n = useI18n();
  const { t, f, lang } = i18n;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const { seasons, arrivals, departures, injuries } = history;
  const last = seasons[seasons.length - 1];
  const metric = careerMetric(seasons);
  const maxMins = Math.max(1, ...seasons.map((s) => s.mins));

  const share = async () => {
    const url = `${location.origin}/${lang}/${currentSeason}/roster#player=${encodeURIComponent(history.name)}`;
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
      ? `${profile.role} · ${f.pos(profile.primary)}${profile.secondary ? ` / ${f.pos(profile.secondary)}` : ""} · ${t(`card.foot.${profile.foot}`)}`
      : f.pos(last.pos),
    last.nat,
  ].filter(Boolean);

  return (
    <Tabs defaultValue="arc" className="grid grid-cols-1 gap-8 border-y border-rule-strong px-8 py-7 max-sm:px-4 md:grid-cols-2">
      <div className="col-span-full grid grid-cols-1 items-end gap-6 border-b border-border pb-[18px] md:grid-cols-[1fr_auto]">
        <div>
          <div className="text-[32px] leading-none font-semibold tracking-[-0.03em] whitespace-normal">{history.name}</div>
          <div className="mt-2 font-mono text-[11px] tracking-[0.1em] whitespace-normal text-mute uppercase">
            {meta.join(" · ")} ·{" "}
            <span className={last.origin === "academy" ? "text-good" : undefined}>{t(`origin.${last.origin}`)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="arc">{t("card.arc")}</TabsTrigger>
            <TabsTrigger value="transfers">{t("card.transfers")}</TabsTrigger>
            <TabsTrigger value="injuries">{t("card.injuries")}</TabsTrigger>
          </TabsList>
          <Button variant="default" onClick={share} aria-live="polite">
            {copied ? t("card.copied") : t("card.share")}
          </Button>
        </div>
      </div>

      <TabsContent value="arc" className="contents">
        <section>
          <H3>{metric === "rating" ? t("card.ratingTrajectory") : t("card.minsPerSeason")}</H3>
          <div className="mt-2.5 flex h-20 items-end gap-1 border-b border-border pb-1">
            {seasons.map((s) => {
              const h = metric === "rating" ? ((s.rating ?? 0) / 9) * 70 : (s.mins / maxMins) * 70;
              const val = metric === "rating" ? f.rating(s.rating) : f.mins(s.mins);
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
          {metric === "mins" && <p className="mt-2 font-mono text-[11px] text-mute">{t("card.noRatings")}</p>}
          {note && (
            <p className="mt-5 border-l-2 border-foreground pl-3.5 text-sm leading-relaxed whitespace-normal text-ink-2">{note}</p>
          )}
        </section>
        <section>
          <H3>{t("card.seasonBySeason")}</H3>
          <table className={detailTable}>
            <thead>
              <tr className={lbl}>
                <td>{t("col.season")}</td>
                <td>{t("col.apps")}</td>
                <td>{t("col.min")}</td>
                <td>{t("col.goals")}</td>
                <td>{t("col.assists")}</td>
                <td>{t("col.rating")}</td>
                <td>{t("col.pos")}</td>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr key={s.season} className={s.season === currentSeason ? "bg-background" : undefined}>
                  <td>{s.season}</td>
                  <td>{s.apps}</td>
                  <td>
                    {f.mins(s.mins)}
                    {s.minsEstimated && <span className="text-mute" title={t("card.estimatedTitle")}>*</span>}
                  </td>
                  <td>{s.goals}</td>
                  <td>{s.assists ?? DASH}</td>
                  <td>{f.rating(s.rating)}</td>
                  <td>{f.pos(s.pos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {seasons.some((s) => s.minsEstimated) && <p className="mt-2 font-mono text-[10px] text-mute">{t("card.estimated")}</p>}
        </section>
      </TabsContent>

      <TabsContent value="transfers" className="contents">
        <section>
          <H3>{t("card.arrived")}</H3>
          <MoveList moves={arrivals} dir="in" empty={t("card.noArrival")} i18n={i18n} />
        </section>
        <section>
          <H3>{t("card.departed")}</H3>
          <MoveList
            moves={departures}
            dir="out"
            empty={last.status === "stay" ? t("card.stillAtClub") : t("card.noDeparture")}
            i18n={i18n}
          />
        </section>
      </TabsContent>

      <TabsContent value="injuries" className="col-span-full">
        <H3>{t("card.injuryHistory")}</H3>
        {injuries.length === 0 ? (
          <p className="font-mono text-xs text-mute">{t("card.noInjuries")}</p>
        ) : (
          <div className="no-scrollbar overflow-x-auto">
            <table className={detailTable}>
              <thead>
                <tr className={lbl}>
                  <td>{t("col.season")}</td>
                  <td>{t("col.type")}</td>
                  <td>{t("col.out")}</td>
                  <td>{t("col.back")}</td>
                  <td>{t("col.weeks")}</td>
                  <td>{t("col.matchesShort")}</td>
                  <td>{t("col.notes")}</td>
                </tr>
              </thead>
              <tbody>
                {injuries.map((i) => (
                  <tr key={i.id}>
                    <td>{i.season}</td>
                    <td>{i.type}</td>
                    <td>{f.day(i.out)}</td>
                    <td>{f.day(i.back)}</td>
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

function MoveList({ moves, dir, empty, i18n }: { moves: Transfer[]; dir: "in" | "out"; empty: string; i18n: I18n }) {
  const { t } = i18n;
  if (!moves.length) return <p className="font-mono text-xs text-mute">{empty}</p>;
  return (
    <div className="space-y-5">
      {moves.map((m) => (
        <table key={m.id} className={detailTable}>
          <tbody>
            <tr>
              <td className={lbl}>{t("col.season")}</td>
              <td>{m.season}</td>
            </tr>
            <tr>
              <td className={lbl}>{dir === "in" ? t("col.from") : t("col.to")}</td>
              <td>{m.club}</td>
            </tr>
            <tr>
              <td className={lbl}>{t("col.fee")}</td>
              <td>{feeLabel(m, i18n)}</td>
            </tr>
            <tr>
              <td className={lbl}>{t("col.type")}</td>
              <td>{t(`type.${m.type}`)}</td>
            </tr>
            {dir === "in" && (
              <tr>
                <td className={lbl}>{t("col.age")}</td>
                <td>{m.age ?? DASH}</td>
              </tr>
            )}
          </tbody>
        </table>
      ))}
    </div>
  );
}
