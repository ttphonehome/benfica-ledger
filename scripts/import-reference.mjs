// One-off: converts the design handoff's window.* data files into the typed
// JSON layout under data/placeholder. Usage:
//   node scripts/import-reference.mjs <handoff-folder>
// Everything it writes is placeholder data and is marked as such.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const dir = process.argv[2];
if (!dir) throw new Error("Pass the handoff folder");
const out = path.resolve("data/placeholder");
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["data.js", "data-managers.js", "data-presidents.js"]) {
  vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx);
}
const w = ctx.window;

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const isoDate = (s) => {
  const m = /^(\w{3}) (\d{2}), (\d{4})$/.exec(s);
  if (!m) throw new Error(`Bad date ${s}`);
  return `${m[3]}-${String(MONTHS[m[1]]).padStart(2, "0")}-${m[2]}`;
};
// Seasons from 2023-24 were typed from recall with estimated minutes.
const estimated = (season) => season >= "2023-24";

const playerSeasons = w.PLAYER_SEASONS.map((p) => ({
  playerId: slug(p.player), player: p.player, season: p.season, pos: p.pos,
  origin: p.origin, nat: p.nat === "—" ? null : p.nat, apps: p.apps, mins: p.mins,
  minsEstimated: estimated(p.season), goals: p.goals,
  assists: p.assists ?? null, rating: p.rating ? p.rating : null, status: p.status,
}));

const transfers = w.TRANSFERS.map((t) => ({
  id: `${t.season}-${t.dir}-${slug(t.player)}-${t.type}`,
  playerId: slug(t.player), player: t.player, season: t.season, dir: t.dir,
  type: t.type, fee: t.fee, club: t.club, pos: t.pos, age: t.age ?? null,
}));
const ids = new Set();
for (const t of transfers) {
  if (ids.has(t.id)) throw new Error(`Duplicate transfer id ${t.id}`);
  ids.add(t.id);
}

const injuries = w.INJURIES.map((i, n) => ({
  id: `${i.season}-${slug(i.player)}-${n}`, playerId: slug(i.player), player: i.player,
  season: i.season, type: i.type, out: isoDate(i.out), back: isoDate(i.back),
  weeks: i.weeks, matches: i.matches, notes: i.notes || null,
}));

const profiles = Object.entries(w.POSITIONS).map(([player, p]) => ({
  playerId: slug(player), player, primary: p.primary,
  secondary: p.secondary === "—" ? null : p.secondary, foot: p.foot, role: p.role,
}));

const seasonContext = Object.entries(w.SEASON_CONTEXT).map(([season, c]) => ({
  season, finish: c.finish, points: c.points, manager: c.manager,
  goalsFor: c.goalsFor, goalsAgainst: c.goalsAgainst, competitions: c.cl,
}));

// Stored ppg, formation, formationPct and tenure are dropped: the app derives them.
const managers = w.MANAGERS.map((m) => ({
  id: m.id, name: m.name, nick: m.nick, appointed: m.appointed, departed: m.departed,
  seasons: m.seasons.map((s) => ({
    season: s.season, wins: s.wins, draws: s.draws, losses: s.losses, gf: s.gf, ga: s.ga,
    finish: s.finish === "—" ? null : parseInt(s.finish, 10), leaguePoints: s.points,
    competitions: s.comps,
    formations: s.formations.map(({ name, matches, w, d, l, gf, ga }) => ({ name, matches, w, d, l, gf, ga })),
    academyMinutesPct: s.academyMinutesPct, youthPromoted: s.youthPromoted,
    avgStartXIAge: s.avgStartXIAge, notes: s.notes, titles: s.titles,
  })),
}));

const HIRE_IDS = {
  "Bruno Lage": "lage-2", "Roger Schmidt": "schmidt", "Nélson Veríssimo": "verissimo",
  "Jorge Jesus (2nd stint)": "jesus-2", "Bruno Lage (1st stint)": "lage-1", "Rui Vitória": "rui-vitoria",
};
// Stored spend, net, ppg, tenure and hire records are dropped: the app derives
// them from transfers, W-D-L, dates and the manager records.
const presidents = w.PRESIDENTS.map((p) => ({
  id: p.id, name: p.name, nick: p.nick, appointed: p.appointed, departed: p.departed, notes: p.notes,
  seasons: p.seasons.map((s) => ({
    season: s.season, manager: s.manager, wins: s.wins, draws: s.draws, losses: s.losses,
    finish: s.finish === "—" ? null : parseInt(s.finish, 10), leaguePoints: s.points,
    titles: s.titles, notes: s.notes,
  })),
  managersHired: p.managersHired.map((h) => {
    const managerId = HIRE_IDS[h.name];
    if (!managerId) throw new Error(`No manager id for hire ${h.name}`);
    return { managerId, verdict: h.verdict, note: h.note };
  }),
}));

const notes = Object.entries(w.NOTES).map(([player, text]) => ({ playerId: slug(player), text }));

const meta = {
  generatedAt: null,
  // data.js describes 2026-27 "as of 13 Sep 2026".
  asOf: "2026-09-13",
  // Goal: the last ten seasons. Floor: every season of Rui Costa's presidency.
  coverageTarget: { firstSeason: "2016-17", minimumFirstSeason: "2021-22" },
  datasets: {
    playerSeasons: "illustrative", transfers: "illustrative", injuries: "illustrative",
    profiles: "illustrative", transferDetails: "illustrative", seasonContext: "illustrative",
    managers: "illustrative", presidents: "illustrative", notes: "illustrative",
  },
  seasons: Object.fromEntries(w.SEASONS.map((s) => [s, {
    status: estimated(s) ? "unverified" : "placeholder",
    note: estimated(s)
      ? "Written from memory and not verified. Minutes are estimated (85 per start, 25 per sub). Ratings and assists not sourced."
      : "Invented placeholder figures for design purposes.",
  }])),
};

const files = { "player-seasons": playerSeasons, transfers, injuries, profiles, "transfer-details": [],
  "season-context": seasonContext, managers, presidents, notes, meta };
fs.mkdirSync(out, { recursive: true });
for (const [name, rows] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(rows, null, 2) + "\n");
}
console.log(Object.entries(files).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : "obj"}`).join("\n"));
