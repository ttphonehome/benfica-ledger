import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { datasetSchema, type Dataset } from "../src/data/schema";
import { parseDataset } from "../src/data/parse";
import { loadManual, type Manual } from "./manual";
import { merge, type MergeInput } from "./merge";
import { moves, playerSeasons, results, type ApiFixture } from "./transform/api-football";

const samples = JSON.parse(readFileSync(new URL("./fixtures/api-samples.json", import.meta.url), "utf8"));
const FILES: Record<keyof Dataset, string> = {
  meta: "meta.json",
  playerSeasons: "player-seasons.json",
  transfers: "transfers.json",
  injuries: "injuries.json",
  profiles: "profiles.json",
  transferDetails: "transfer-details.json",
  seasonContext: "season-context.json",
  managers: "managers.json",
  presidents: "presidents.json",
  notes: "notes.json",
};
const root = path.resolve(import.meta.dirname, "..");
const placeholder = datasetSchema.parse(
  Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, JSON.parse(readFileSync(path.join(root, "data/placeholder", f), "utf8"))])),
);

let manual: Manual;
beforeAll(async () => {
  manual = await loadManual(path.join(root, "data/manual"));
});

function input(overrides: Partial<MergeInput> = {}): MergeInput {
  const fx = samples.fixtures as ApiFixture[];
  return {
    asOf: "2026-10-01",
    target: ["2023-24", "2024-25", "2025-26"],
    api: new Map([
      [
        "2024-25",
        { season: "2024-25", players: playerSeasons([samples.player]), injuries: [], results: results(fx), standing: { rank: 2, team: { id: 211 }, points: 80, all: { played: 34, goals: { for: 84, against: 28 } } } },
      ],
    ]),
    moves: moves(samples.transfers),
    coaches: [],
    formations: new Map(),
    wiki: new Map([
      [
        "2025-26",
        {
          season: "2025-26",
          title: "2025–26 S.L. Benfica season",
          revid: 1,
          squad: {
            competitions: ["Primeira Liga"],
            players: [
              { name: "Nicolás Otamendi", display: "Otamendi", pos: "DF", nat: "ARG", starts: 30, subs: 2, goals: 3, leftDuringSeason: false, onLoan: false },
              { name: "Unused Keeper", display: "Unused Keeper", pos: "GK", nat: "POR", starts: 0, subs: 0, goals: 0, leftDuringSeason: false, onLoan: false },
            ],
          },
          infobox: { leaguePosition: 3, managers: ["José Mourinho"] },
        },
      ],
    ]),
    manual,
    placeholder,
    ...overrides,
  };
}

describe("merge", () => {
  it("picks API, then Wikipedia, then placeholder per season, and records provenance", () => {
    const { dataset, report } = merge(input());
    expect(report.seasons).toEqual({ "2023-24": "placeholder", "2024-25": "api", "2025-26": "wikipedia" });
    expect(dataset.meta.seasons["2024-25"].status).toBe("sourced");
    expect(dataset.meta.seasons["2025-26"].status).toBe("partial");
    expect(dataset.meta.seasons["2023-24"].status).toBe(placeholder.meta.seasons["2023-24"].status);
    expect(report.warnings.some((w) => w.startsWith("2023-24: no API or Wikipedia"))).toBe(true);
  });

  it("keeps API minutes and estimates Wikipedia minutes, skipping players with no games", () => {
    const { dataset } = merge(input());
    const jm = dataset.playerSeasons.find((p) => p.season === "2024-25" && p.player === "João Mário");
    expect(jm).toMatchObject({ apps: 2, mins: 155, minsEstimated: false, rating: 7.3 });
    const ota = dataset.playerSeasons.filter((p) => p.season === "2025-26");
    expect(ota).toHaveLength(1);
    expect(ota[0]).toMatchObject({ player: "Nicolás Otamendi", apps: 32, mins: 30 * 85 + 2 * 25, minsEstimated: true, rating: null, assists: null });
  });

  it("takes transfers from the API for the target seasons only", () => {
    const { dataset } = merge(input());
    expect(dataset.transfers.map((t) => `${t.season} ${t.dir} ${t.player} ${t.type}`)).toEqual([
      "2023-24 in Juan Bernat loan-in",
      "2024-25 out Juan Bernat permanent",
    ]);
    expect(dataset.meta.datasets.transfers).toBe("sourced");
  });

  it("falls back to placeholder transfers, with a warning, when the API has none", () => {
    const { dataset, report } = merge(input({ moves: null }));
    expect(dataset.transfers.length).toBeGreaterThan(0);
    expect(dataset.meta.datasets.transfers).toBe("illustrative");
    expect(report.warnings).toContain("Transfers unavailable from the API; kept the design-handoff placeholder transfers");
  });

  it("uses the API standing for season context, then the Wikipedia infobox", () => {
    const { dataset } = merge(input());
    const ctx = Object.fromEntries(dataset.seasonContext.map((c) => [c.season, c]));
    expect(ctx["2024-25"]).toMatchObject({ leaguePosition: 2, points: 80, goalsFor: 84, goalsAgainst: 28 });
    expect(ctx["2025-26"]).toMatchObject({ leaguePosition: 3, points: null, manager: "José Mourinho" });
  });

  it("produces a dataset the site accepts", () => {
    const { dataset } = merge(input());
    expect(() => parseDataset(dataset, "merge test")).not.toThrow();
  });
});
