// One-off: seeds data/manual/*.csv from the placeholder (design handoff) data.
// Every seeded row is marked verified=no and sourced to the handoff.
import fs from "node:fs";

const P = (f) => JSON.parse(fs.readFileSync(`data/placeholder/${f}.json`, "utf8"));
const q = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const write = (name, header, rows, comment) => {
  const lines = [`# ${comment}`, header.join(","), ...rows.map((r) => header.map((h) => q(r[h])).join(","))];
  fs.writeFileSync(`data/manual/${name}.csv`, lines.join("\n") + "\n");
  console.log(name, rows.length);
};
const SRC = "design handoff";

const players = P("player-seasons");
const academy = [...new Map(players.filter((p) => p.origin === "academy").map((p) => [p.player, p])).values()];
write("academy", ["player", "source", "verified"], academy.map((p) => ({ player: p.player, source: SRC, verified: "no" })),
  "Players who came through Benfica's academy. Everyone else counts as signed. Set verified=yes once checked.");

write("profiles", ["player", "primary", "secondary", "foot", "role", "source", "verified"],
  P("profiles").map((p) => ({ ...p, secondary: p.secondary ?? "", source: SRC, verified: "no" })),
  "Player role profiles. Positions use GK CB LB RB LWB RWB DF DM CM AM LM RM MF LW RW ST FW; foot is L, R or B.");

write("managers", ["id", "name", "nick", "appointed", "departed", "source", "verified"],
  P("managers").map((m) => ({ id: m.id, name: m.name, nick: m.nick, appointed: m.appointed, departed: m.departed ?? "", source: SRC, verified: "no" })),
  "Manager tenures (YYYY-MM-DD; leave departed empty for the current manager). Records are computed from match results.");

write("manager-notes", ["manager_id", "season", "notes", "youth_promoted", "source"],
  P("managers").flatMap((m) => m.seasons.map((s) => ({ manager_id: m.id, season: s.season, notes: s.notes, youth_promoted: s.youthPromoted.join("; "), source: SRC }))),
  "Editorial notes and academy promotions per manager and season. youth_promoted is a ; separated list.");

write("presidents", ["id", "name", "nick", "appointed", "departed", "notes", "source", "verified"],
  P("presidents").map((p) => ({ id: p.id, name: p.name, nick: p.nick, appointed: p.appointed, departed: p.departed ?? "", notes: p.notes, source: SRC, verified: "no" })),
  "Club presidents. No football API covers these, so this file is the source.");

write("president-notes", ["president_id", "season", "notes", "source"],
  P("presidents").flatMap((p) => p.seasons.map((s) => ({ president_id: p.id, season: s.season, notes: s.notes, source: SRC }))),
  "Editorial notes per president and season.");

write("manager-hires", ["president_id", "manager_id", "verdict", "note"],
  P("presidents").flatMap((p) => p.managersHired.map((h) => ({ president_id: p.id, manager_id: h.managerId, verdict: h.verdict, note: h.note }))),
  "Editorial verdict on each appointment: good, neutral or bad.");

write("overrides", ["kind", "player", "season", "dir", "value", "source_name", "source_url", "note"], [],
  "Hand-entered corrections that win over the automatic sources. kind: fee (EUR millions, needs dir in/out), rating, assists, minutes. Always give a source (e.g. Transfermarkt, SofaScore, CMVM filing, Maisfutebol) and its URL.");

write("titles", ["season", "competition", "source_url"], [],
  "Trophies won, if the API's coach trophies miss any. One row per trophy.");

write("notes", ["player", "text", "source"], [], "Editorial notes shown on player cards and in the Transfer Audit.");

write("player-aliases", ["alias", "name"], [],
  "Name fixes when sources spell a player differently (alias -> name used on the site).");
