import { describe, expect, it } from "vitest";
import { jsonDirSource } from "@/data/sources/json-dir";
import { parseDataset } from "@/data/parse";
import type { Transfer } from "@/data/schema";
import { seasonSpending } from "./spending";
import { careerMetric, defaultRosterSort, playerHistory, rosterRows, latestSeasonFor } from "./roster";
import { latestSeason, seasonsNewestFirst } from "./seasons";
import { fmtMoney, fmtNet, fmtTotal } from "../format";

const placeholder = async () => {
  const src = jsonDirSource("data/placeholder");
  return parseDataset(await src.load(), src.name);
};

const move = (over: Partial<Transfer>): Transfer => ({
  id: Math.random().toString(36), playerId: "p", player: "P", season: "2025-26", dir: "in",
  type: "permanent", fee: 0, club: "X", pos: "CM", age: null, ...over,
});

describe("placeholder dataset", () => {
  it("loads, validates and has every row from the handoff", async () => {
    const d = await placeholder();
    expect(d.playerSeasons).toHaveLength(177);
    expect(d.transfers).toHaveLength(128);
    expect(d.injuries).toHaveLength(6);
    expect(d.profiles).toHaveLength(19);
    expect(d.managers).toHaveLength(6);
    expect(d.presidents).toHaveLength(2);
    expect(seasonsNewestFirst(d)).toEqual(["2026-27", "2025-26", "2024-25", "2023-24", "2022-23", "2021-22"]);
    expect(latestSeason(d)).toBe("2026-27");
  });
});

describe("seasonSpending", () => {
  it("counts only permanent fees", () => {
    const s = seasonSpending([
      move({ fee: 10 }),
      move({ type: "loan-in", fee: 6.1 }),
      move({ type: "loan-end", fee: 10 }),
      move({ dir: "out", fee: 20 }),
      move({ dir: "out", type: "free", fee: 0 }),
      move({ season: "2024-25", fee: 99 }),
    ], "2025-26");
    expect(s).toMatchObject({ spent: 10, received: 20, net: 10, bought: 1, sold: 1, loansIn: 1, frees: 1, avgFee: 10 });
  });

  it("derives net from whole-€m totals so displayed figures add up", () => {
    const s = seasonSpending([move({ fee: 10.4 }), move({ dir: "out", fee: 0.6 })], "2025-26");
    expect(fmtTotal(s.spent)).toBe("€10m");
    expect(fmtTotal(s.received)).toBe("€1m");
    expect(fmtNet(s.net)).toBe("−€9m");
  });

  it("matches the handoff's figures for every season", async () => {
    const d = await placeholder();
    const shown = (season: string) => {
      const s = seasonSpending(d.transfers, season);
      return [Math.round(s.spent), Math.round(s.received), s.net];
    };
    expect(shown("2026-27")).toEqual([85, 132, 47]);
    expect(shown("2025-26")).toEqual([105, 100, -5]);
    expect(shown("2024-25")).toEqual([72, 162, 90]);
    expect(shown("2023-24")).toEqual([96, 111, 15]);
    expect(shown("2022-23")).toEqual([57, 92, 35]);
    expect(shown("2021-22")).toEqual([47, 16, -31]);
  });

  it("has no average fee without permanent signings", () => {
    expect(seasonSpending([], "2025-26").avgFee).toBeNull();
  });
});

describe("roster", () => {
  it("adds injury weeks per season", async () => {
    const d = await placeholder();
    const rows = rosterRows(d, "2021-22");
    expect(rows.find((r) => r.player === "Lucas Veríssimo")?.weeksInjured).toBe(28);
    expect(rows.find((r) => r.player === "Darwin Núñez")?.weeksInjured).toBe(0);
  });

  it("sorts by apps when a season has no ratings", async () => {
    const d = await placeholder();
    expect(defaultRosterSort(rosterRows(d, "2026-27"))).toBe("apps");
    expect(defaultRosterSort(rosterRows(d, "2022-23"))).toBe("rating");
  });

  it("charts minutes when a player has no ratings at all", async () => {
    const d = await placeholder();
    expect(careerMetric(playerHistory(d, "clement-lenglet")!.seasons)).toBe("mins");
    expect(careerMetric(playerHistory(d, "rafa-silva")!.seasons)).toBe("rating");
  });

  it("lists every move, newest first", async () => {
    const d = await placeholder();
    const h = playerHistory(d, "rafa-silva")!;
    expect(h.arrivals.map((t) => t.season)).toEqual(["2025-26"]);
    expect(h.departures.map((t) => `${t.season} ${t.type}`)).toEqual(["2024-25 free"]);
  });

  it("finds a deep-linked player's latest season", async () => {
    const d = await placeholder();
    expect(latestSeasonFor(d, (p) => p.player === "Enzo Fernández")).toEqual({ season: "2022-23", playerId: "enzo-fernandez" });
    expect(latestSeasonFor(d, (p) => p.player === "Nobody")).toBeNull();
  });
});

describe("format", () => {
  it("formats fees and balances", () => {
    expect(fmtMoney(null)).toBe("—");
    expect(fmtMoney(0.9)).toBe("€0.9m");
    expect(fmtMoney(22.8)).toBe("€23m");
    expect(fmtNet(0.4)).toBe("€0");
    expect(fmtNet(47)).toBe("+€47m");
  });
});
