// One-off probe of the API-Football account: plan, quota, Benfica's team id,
// which seasons the plan allows, and the shape of each endpoint we need.
// Prints summaries and small samples only. Never prints the key.
// Usage: API_FOOTBALL_KEY=... node pipeline/probe.mjs
const KEY = process.env.API_FOOTBALL_KEY;
if (!KEY) {
  console.error("API_FOOTBALL_KEY is not set. Add it under Settings > Secrets and variables > Actions.");
  process.exit(1);
}
const BASE = "https://v3.football.api-sports.io";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;

async function get(path) {
  if (calls++) await sleep(7000); // stay under 10 requests per minute
  const res = await fetch(BASE + path, { headers: { "x-apisports-key": KEY } });
  const body = await res.json().catch(() => ({}));
  const left = res.headers.get("x-ratelimit-requests-remaining");
  const errs = body.errors && (Array.isArray(body.errors) ? body.errors.length : Object.keys(body.errors).length) ? body.errors : null;
  console.log(`\n## GET ${path} -> HTTP ${res.status}, results ${body.results ?? "?"}, paging ${JSON.stringify(body.paging ?? null)}, daily left ${left}`);
  if (errs) console.log("   errors:", JSON.stringify(errs));
  return body;
}
const sample = (x, n = 1500) => {
  const s = JSON.stringify(x) ?? "undefined";
  return s.length > n ? s.slice(0, n) + "…" : s;
};
const shape = (o, depth = 0) => {
  if (o === null || typeof o !== "object") return typeof o;
  if (Array.isArray(o)) return o.length ? [shape(o[0], depth + 1)] : [];
  if (depth > 3) return "{…}";
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v, depth + 1)]));
};

const status = await get("/status");
const r = status.response ?? {};
console.log("   plan:", sample(r.subscription), "requests:", sample(r.requests));

const teams = await get("/teams?search=Benfica");
for (const t of teams.response ?? []) console.log(`   team ${t.team.id} ${t.team.name} (${t.team.country})`);
const benfica = (teams.response ?? []).find((t) => t.team.country === "Portugal" && t.team.name === "Benfica");
if (!benfica) { console.log("Could not identify Benfica; stopping."); process.exit(1); }
const id = benfica.team.id;
console.log("   => Benfica team id", id);

// Run 1 found the free plan allows 2022-2024 only. Probe shapes on 2024.
const Y = Number(process.env.PROBE_SEASON ?? 2024);
const pl = await get(`/players?team=${id}&season=${Y}&page=1`);
if (pl.response?.[0]) {
  const p0 = pl.response[0];
  console.log("   player shape:", sample(shape(p0), 2500));
  console.log("   sample player:", sample(p0.player, 600));
  for (const st of p0.statistics ?? []) console.log("   stat:", sample(st, 900));
}

const tr = await get(`/transfers?team=${id}`);
const moves = (tr.response ?? []).flatMap((p) => p.transfers.map((t) => ({ player: p.player.name, ...t })));
console.log("   transfer players", tr.results, "moves", moves.length, "date range", moves.map((m) => m.date).sort()[0], "→", moves.map((m) => m.date).sort().at(-1));
console.log("   distinct type values:", sample([...new Set(moves.map((m) => m.type))], 1200));
console.log("   sample move:", sample(moves.find((m) => m.date >= "2024-06-01"), 600));

const inj = await get(`/injuries?team=${id}&season=${Y}`);
console.log("   injury count:", inj.results, "sample:", sample(inj.response?.slice(0, 2), 1400));

const co = await get(`/coachs?team=${id}`);
for (const c of co.response ?? []) {
  const stints = (c.career ?? []).filter((x) => x.team?.id === id).map((x) => `${x.start}→${x.end}`);
  console.log(`   coach ${c.id} ${c.name}: ${stints.join(", ")}`);
}

const fx = await get(`/fixtures?team=${id}&season=${Y}`);
console.log("   fixture leagues:", sample([...new Set((fx.response ?? []).map((f) => `${f.league.id}:${f.league.name}`))]));
console.log("   fixture sample:", sample(fx.response?.[0], 900));

console.log("   fixtures:", fx.results, "statuses:", sample([...new Set((fx.response ?? []).map((f) => f.fixture.status.short))]));
const st = await get(`/standings?league=94&season=${Y}`);
const row = st.response?.[0]?.league?.standings?.[0]?.find((x) => x.team.id === id);
console.log("   standings row:", sample(row, 600));

const done = (fx.response ?? []).find((f) => f.fixture.status.short === "FT");
if (done) {
  const lu = await get(`/fixtures/lineups?fixture=${done.fixture.id}`);
  console.log("   lineup formations:", sample((lu.response ?? []).map((l) => `${l.team.id}:${l.formation}`)));
}

const schmidt = (co.response ?? []).find((c) => /Schmidt/.test(c.name)) ?? co.response?.[0];
const tro = schmidt ? await get(`/trophies?coach=${schmidt.id}`) : null;
if (tro) console.log("   trophies:", sample(tro.response, 1500));
// Also check what the free plan returns for the current season on fixtures and standings.
const cur = await get(`/fixtures?team=${id}&season=2026`);
console.log("   current-season fixtures:", cur.results);
const sq = await get(`/players/squads?team=${id}`);
console.log("   current squad (players/squads):", sq.results, sample(sq.response?.[0]?.players?.slice(0, 3), 600));
console.log(`\nDone in ${calls} requests.`);
