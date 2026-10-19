import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseInfobox, parseSquadStats, splitTemplate } from "./wikipedia";

// Fixture: excerpt of the real "2026–27 S.L. Benfica season" wikitext as returned by the probe.
const text = readFileSync(new URL("../fixtures/wiki-efs.txt", import.meta.url), "utf8");

describe("wikipedia squad stats", () => {
  it("splits on top-level pipes only", () => {
    expect(splitTemplate("Efs player|name=[[A (b)|A]]|pos=GK|1+2|3")).toEqual(["Efs player", "name=[[A (b)|A]]", "pos=GK", "1+2", "3"]);
  });

  it("reads competitions and every player row", () => {
    const s = parseSquadStats(text);
    expect(s.competitions).toEqual(["Primeira Liga", "Taça de Portugal", "Taça da Liga", "Europa League"]);
    expect(s.players.map((p) => p.name)).toEqual([
      "Anatoliy Trubin", "Samuel Soares", "Clément Lenglet", "José Neto", "Florentino Luís", "Amar Dedić", "Júlio César",
    ]);
  });

  it("sums starts, subs and goals across competitions", () => {
    const s = parseSquadStats(text);
    const by = Object.fromEntries(s.players.map((p) => [p.name, p]));
    expect(by["Clément Lenglet"]).toMatchObject({ starts: 14, subs: 0, goals: 2, pos: "DF", nat: "FRA" });
    expect(by["Florentino Luís"]).toMatchObject({ display: "Florentino", starts: 1, subs: 6, goals: 1 });
    expect(by["Júlio César"]).toMatchObject({ starts: 14, subs: 1, goals: 0 }); // negative = conceded
  });

  it("flags players listed as leaving during the season", () => {
    const s = parseSquadStats(text);
    expect(s.players.filter((p) => p.leftDuringSeason).map((p) => p.name)).toEqual(["Amar Dedić", "Júlio César"]);
  });

  it("reads league position and manager from the infobox", () => {
    const box = "{{Infobox football club season\n| club = [[S.L. Benfica|Benfica]]\n| manager = [[Rui Vitória]]\n| league = [[2016–17 Primeira Liga|Primeira Liga]]\n| league result = 1st\n}}";
    expect(parseInfobox(box)).toEqual({ leaguePosition: 1, managers: ["Rui Vitória"] });
  });
});

describe("plain wikitable squad stats (older articles)", () => {
  const table = readFileSync(new URL("../fixtures/wiki-table.txt", import.meta.url), "utf8");
  it("reads the Total columns, competitions and the left-during-season block", () => {
    const r = parseSquadStats(table);
    expect(r.competitions).toEqual(["Primeira Liga", "Taça de Portugal", "Taça da Liga", "Supertaça", "Champions League"]);
    expect(r.players).toEqual([
      { name: "Mile Svilar", display: "Mile Svilar", pos: "GK", nat: "BEL", starts: 9, subs: 0, goals: 0, leftDuringSeason: false, onLoan: false },
      { name: "Lisandro López", display: "Lisandro López", pos: "DF", nat: "ARG", starts: 6, subs: 2, goals: 1, leftDuringSeason: true, onLoan: false },
    ]);
  });
});
