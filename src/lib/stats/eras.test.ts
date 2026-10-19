import { describe, expect, it } from "vitest";
import { jsonDirSource } from "@/data/sources/json-dir";
import { parseDataset } from "@/data/parse";
import { auditRows, auditSummary, judgeIn, judgeOut } from "./audit";
import { formationAgg, managerAgg, playerTrust } from "./managers";
import { performers, squadStats } from "./overview";
import { presidentAgg, presidentSeasons } from "./presidents";
import { monthsBetween } from "../dates";

const load = async () => {
  const src = jsonDirSource("data/placeholder");
  return parseDataset(await src.load(), src.name);
};

describe("overview", () => {
  it("matches the handoff's 2022-23 headline numbers", async () => {
    const d = await load();
    const s = squadStats(d.playerSeasons.filter((p) => p.season === "2022-23"));
    expect(s.squadSize).toBe(17);
    expect(Math.round(s.academySharePct!)).toBe(24);
    expect(Math.round(s.academyMinutesPct!)).toBe(23);
    expect(s.avgRating!.toFixed(2)).toBe("7.27");
  });

  it("falls back to scorers and minutes without ratings", async () => {
    const d = await load();
    const p = performers(d.playerSeasons.filter((x) => x.season === "2026-27"));
    expect(p.mode).toBe("fallback");
    expect(p.top[0].player).toBe("Vangelis Pavlidis");
    expect(p.bottom[0].player).toBe("Clément Lenglet");
  });
});

describe("audit", () => {
  it("judges departures on the player's last season at the club", async () => {
    const d = await load();
    const { outs } = auditRows(d, "2022-23");
    const darwin = outs.find((r) => r.player === "Darwin Núñez")!;
    expect(darwin).toMatchObject({ statsSeason: "2021-22", rating: 8.0, verdict: "good" });
  });

  it("never judges a move without a rating", () => {
    expect(judgeOut({ rating: null, fee: 50 })).toBe("neutral");
    expect(judgeIn({ rating: null, fee: 50, type: "permanent" })).toBe("neutral");
  });

  it("gives no quality verdict when a side has no ratings", async () => {
    const d = await load();
    const { ins, outs } = auditRows(d, "2026-27");
    const s = auditSummary(ins, outs);
    expect(s.tradeVerdict).toBeNull();
    expect([Math.round(s.totalIn), Math.round(s.totalOut)]).toEqual([85, 132]);
  });
});

describe("managers", () => {
  it("derives records and rates from W-D-L", async () => {
    const d = await load();
    const a = (id: string) => managerAgg(d.managers.find((m) => m.id === id)!, d.meta.asOf);
    expect(a("rui-vitoria")).toMatchObject({ w: 87, d: 21, l: 12, matches: 120 });
    expect(a("rui-vitoria").winPct.toFixed(0)).toBe("73");
    expect(a("jesus-2").ppg.toFixed(2)).toBe("2.19");
    expect(a("lage-2").tenureMonths).toBe(26);
  });

  it("sums formations and their share", async () => {
    const d = await load();
    const f = formationAgg(d.managers.find((m) => m.id === "schmidt")!.seasons);
    expect(f[0]).toMatchObject({ name: "4-2-3-1", matches: 61, w: 45 });
    expect(Math.round(f[0].sharePct)).toBe(80);
  });

  it("averages only real ratings for trusted players", async () => {
    const d = await load();
    const t = playerTrust(d, d.managers.find((m) => m.id === "lage-2")!);
    expect(t.xi).toHaveLength(11);
    expect(t.xi.every((p) => p.rating === null)).toBe(true);
    expect(playerTrust(d, d.managers.find((m) => m.id === "rui-vitoria")!).hasPlayerData).toBe(false);
  });

  it("counts calendar months", () => {
    expect(monthsBetween("2024-06-15", "2024-07-14")).toBe(0);
    expect(monthsBetween("2024-06-15", "2024-07-15")).toBe(1);
  });
});

describe("presidents", () => {
  it("credits a season's spend to whoever was in office on 1 July", async () => {
    const d = await load();
    const costa = d.presidents.find((p) => p.id === "costa")!;
    const rows = presidentSeasons(d, costa);
    expect(rows.find((r) => r.season === "2021-22")!.spendNote).toBe("not-in-office");
    expect(rows.find((r) => r.season === "2024-25")!.net).toBe(90);
    const agg = presidentAgg(d, costa, d.managers, d.meta.asOf);
    expect(agg).toMatchObject({ netSpend: 140, spendSeasons: 3, titles: 2, leagueTitles: 1, otherTitles: 1 });
  });

  it("does not count the Taça da Liga as a league title", async () => {
    const d = await load();
    const v = presidentAgg(d, d.presidents.find((p) => p.id === "vieira")!, d.managers, d.meta.asOf);
    expect(v).toMatchObject({ titles: 5, leagueTitles: 3, otherTitles: 2, netSpend: -31, spendSeasons: 1 });
    expect(v.hires.find((h) => h.managerId === "rui-vitoria")!.record).toEqual({ w: 87, d: 21, l: 12 });
  });
});

describe("coverage", () => {
  it("reports covered and missing seasons against the ten-season target", async () => {
    const { coverage, seasonRange } = await import("./coverage");
    expect(seasonRange("2016-17", "2019-20")).toEqual(["2016-17", "2017-18", "2018-19", "2019-20"]);
    const c = coverage(await load());
    expect(c.target).toHaveLength(11);
    expect(c.covered).toEqual(["2021-22", "2022-23", "2023-24", "2024-25", "2025-26", "2026-27"]);
    expect(c.missing).toEqual(["2016-17", "2017-18", "2018-19", "2019-20", "2020-21"]);
    expect(c.meetsMinimum).toBe(true);
  });
});
