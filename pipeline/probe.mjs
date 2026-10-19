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
  const s = JSON.stringify(x);
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

const seasonAccess = {};
for (let y = 2016; y <= 2026; y++) {
  const p = await get(`/players?team=${id}&season=${y}&page=1`);
  seasonAccess[y] = p.errors && Object.keys(p.errors).length ? `blocked: ${sample(p.errors, 200)}` : `ok (${p.results} on page 1 of ${p.paging?.total})`;
  if (y === 2025 && p.response?.[0]) {
    console.log("   player shape:", sample(shape(p.response[0]), 2500));
    const s = p.response[0].statistics?.[0];
    console.log("   sample statistics[0]:", sample(s, 1500));
    console.log("   leagues in statistics[]:", sample(p.response[0].statistics?.map((x) => `${x.league?.id}:${x.league?.name}:${x.team?.id}`)));
  }
}
console.log("\n   SEASON ACCESS:", JSON.stringify(seasonAccess, null, 1));

const tr = await get(`/transfers?team=${id}`);
const moves = (tr.response ?? []).flatMap((p) => p.transfers.map((t) => ({ player: p.player.name, ...t })));
console.log("   transfer players", tr.results, "moves", moves.length, "date range", moves.map((m) => m.date).sort()[0], "→", moves.map((m) => m.date).sort().at(-1));
console.log("   distinct type values:", sample([...new Set(moves.map((m) => m.type))], 1200));
console.log("   sample move:", sample(moves.find((m) => m.date >= "2024-06-01"), 600));

const inj = await get(`/injuries?team=${id}&season=2025`);
console.log("   injury sample:", sample(inj.response?.[0], 900));

const co = await get(`/coachs?team=${id}`);
for (const c of co.response ?? []) {
  const stints = (c.career ?? []).filter((x) => x.team?.id === id).map((x) => `${x.start}→${x.end}`);
  console.log(`   coach ${c.id} ${c.name}: ${stints.join(", ")}`);
}

const fx = await get(`/fixtures?team=${id}&season=2025`);
console.log("   fixture leagues:", sample([...new Set((fx.response ?? []).map((f) => `${f.league.id}:${f.league.name}`))]));
console.log("   fixture sample:", sample(fx.response?.[0], 900));

const st = await get(`/standings?league=94&season=2025`);
const row = st.response?.[0]?.league?.standings?.[0]?.find((x) => x.team.id === id);
console.log("   standings row:", sample(row, 600));

const done = (fx.response ?? []).find((f) => f.fixture.status.short === "FT");
if (done) {
  const lu = await get(`/fixtures/lineups?fixture=${done.fixture.id}`);
  console.log("   lineup formations:", sample((lu.response ?? []).map((l) => `${l.team.id}:${l.formation}`)));
}

const tro = co.response?.[0] ? await get(`/trophies?coach=${co.response[0].id}`) : null;
if (tro) console.log("   trophies sample:", sample(tro.response?.slice(0, 5), 800));
console.log(`\nDone in ${calls} requests.`);
