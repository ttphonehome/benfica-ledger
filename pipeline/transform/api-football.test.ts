import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { injurySpells, moves, playerSeasons, results, wonTrophies } from "./api-football";

// Fixtures follow the real response shapes printed by pipeline/probe.mjs.
const s = JSON.parse(readFileSync(new URL("../fixtures/api-samples.json", import.meta.url), "utf8"));

describe("api-football transforms", () => {
  it("sums competitions, skips friendlies and weights ratings by minutes", () => {
    const [p] = playerSeasons([s.player]);
    expect(p).toMatchObject({ apiId: 206, apps: 2, starts: 2, minutes: 155, goals: 0, assists: 0, rating: 7.3, position: "MF", birthDate: "1993-01-19" });
  });

  it("groups missed fixtures into injury spells and ignores suspensions and doubts", () => {
    const spells = injurySpells(s.injuries);
    expect(spells).toHaveLength(2);
    expect(spells[0]).toMatchObject({ apiName: "T. Gouveia", out: "2024-09-19", lastMissed: "2024-09-28", matches: 2, weeks: 2 });
    expect(spells[1]).toMatchObject({ out: "2024-12-01", matches: 1 });
  });

  it("scores results from Benfica's side and treats shoot-outs as draws", () => {
    const r = results(s.fixtures);
    expect(r.map((x) => `${x.date} ${x.result} ${x.gf}-${x.ga}`)).toEqual(["2024-08-10 l 0-2", "2024-10-30 w 3-0", "2025-03-01 d 1-1"]);
  });

  it("keeps Benfica's moves once each, dated to the right window", () => {
    const m = moves(s.transfers);
    expect(m.map((x) => `${x.season} ${x.dir} ${x.apiName} ${x.type} ${x.fee}`)).toEqual([
      "2020-21 in Darwin Núñez permanent 24",
      "2022-23 out Darwin Núñez permanent 75",
      "2023-24 in Juan Bernat loan-in null",
      "2024-25 out Juan Bernat permanent null",
    ]);
  });

  it("keeps only Portuguese wins as titles", () => {
    expect(wonTrophies([
      { league: "Primeira Liga", country: "Portugal", season: "2022/2023", place: "Winner" },
      { league: "Super Cup", country: "Portugal", season: "2023/2024", place: "Winner" },
      { league: "KNVB Beker", country: "Holland", season: "2021/2022", place: "Winner" },
      { league: "Primeira Liga", country: "Portugal", season: "2023/2024", place: "2nd Place" },
    ])).toEqual([{ season: "2022-23", competition: "Primeira Liga" }, { season: "2023-24", competition: "Supertaça" }]);
  });
});
