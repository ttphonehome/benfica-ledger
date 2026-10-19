// Parses the squad statistics table ({{Efs start}} / {{Efs player}}) and the
// infobox of an English Wikipedia "S.L. Benfica season" article.

export interface WikiPlayerRow {
  /** Article title of the player's page (disambiguation removed), else the display name. */
  name: string;
  display: string;
  pos: "GK" | "DF" | "MF" | "FW" | null;
  nat: string | null;
  starts: number;
  subs: number;
  goals: number;
  /** Listed under "transferred out" / "left during the season". */
  leftDuringSeason: boolean;
  /** Listed under players out on loan. */
  onLoan: boolean;
}

export interface WikiSeason {
  competitions: string[];
  players: WikiPlayerRow[];
}

/** Splits a template body on top-level pipes, ignoring pipes inside [[...]] and {{...}}. */
export function splitTemplate(body: string): string[] {
  const parts: string[] = [];
  let depthLink = 0, depthTpl = 0, cur = "";
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === "[[") { depthLink++; cur += two; i++; continue; }
    if (two === "]]") { depthLink = Math.max(0, depthLink - 1); cur += two; i++; continue; }
    if (two === "{{") { depthTpl++; cur += two; i++; continue; }
    if (two === "}}") { depthTpl = Math.max(0, depthTpl - 1); cur += two; i++; continue; }
    if (body[i] === "|" && !depthLink && !depthTpl) { parts.push(cur); cur = ""; continue; }
    cur += body[i];
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

/** Finds every {{Name ...}} template (case-insensitive name), returning bodies without braces. */
export function findTemplates(text: string, name: string): { body: string; index: number }[] {
  const out: { body: string; index: number }[] = [];
  const re = new RegExp(`\\{\\{\\s*${name}\\b`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let depth = 0, j = m.index;
    for (; j < text.length - 1; j++) {
      if (text.startsWith("{{", j)) { depth++; j++; continue; }
      if (text.startsWith("}}", j)) { depth--; j++; if (depth === 0) break; }
    }
    out.push({ body: text.slice(m.index + 2, j - 1), index: m.index });
  }
  return out;
}

/** [[Target (disambig)|Shown]] -> { target: "Target", shown: "Shown" }; strips ''(B)'' etc. */
export function parseLink(s: string): { target: string; shown: string } {
  const m = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(s);
  const clean = (x: string) => x.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (!m) {
    const plain = s.replace(/''[^']*''/g, "").replace(/<[^>]+>/g, "").trim();
    return { target: plain, shown: plain };
  }
  return { target: clean(m[1]), shown: (m[2] ?? clean(m[1])).trim() };
}

const num = (s: string | undefined) => {
  const n = parseInt((s ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

function parseApps(s: string): [number, number] {
  const [a, b] = s.split("+");
  return [num(a), num(b)];
}

export function parseSquadStats(wikitext: string): WikiSeason {
  const start = findTemplates(wikitext, "Efs start")[0];
  const competitions = start
    ? splitTemplate(start.body).slice(1).filter((x) => x && !x.includes("=")).map((x) => parseLink(x.replace(/\{\{ref[^}]*\}\}/gi, "")).shown)
    : [];

  // Section headers between rows tell us who left or was loaned out.
  const markers = [...wikitext.matchAll(/^!.*$/gm)].map((m) => ({
    index: m.index ?? 0,
    left: /transferred out|left the club|left during|departed/i.test(m[0]),
    loan: /on loan|loaned out/i.test(m[0]),
  }));

  const players: WikiPlayerRow[] = [];
  for (const t of findTemplates(wikitext, "Efs player")) {
    const parts = splitTemplate(t.body).slice(1);
    const named: Record<string, string> = {};
    const positional: string[] = [];
    for (const p of parts) {
      const eq = /^([a-z]+)\s*=\s*([\s\S]*)$/i.exec(p);
      if (eq) named[eq[1].toLowerCase()] = eq[2].trim();
      else positional.push(p);
    }
    let starts = 0, subs = 0, goals = 0;
    for (let i = 0; i + 1 < positional.length; i += 2) {
      const [s, b] = parseApps(positional[i]);
      starts += s;
      subs += b;
      goals += Math.max(0, num(positional[i + 1])); // goalkeepers' negative numbers are goals conceded
    }
    const { target, shown } = parseLink(named.name ?? "");
    const section = markers.filter((m) => m.index < t.index).at(-1);
    const pos = (named.pos ?? "").toUpperCase();
    players.push({
      name: target,
      display: shown,
      pos: pos === "GK" || pos === "DF" || pos === "MF" || pos === "FW" ? pos : null,
      nat: named.nat ? named.nat.toUpperCase() : null,
      starts,
      subs,
      goals,
      leftDuringSeason: !!section?.left,
      onLoan: !!section?.loan,
    });
  }
  return { competitions, players };
}

export interface WikiInfobox {
  leaguePosition: number | null;
  managers: string[];
}

export function parseInfobox(wikitext: string): WikiInfobox {
  const field = (name: string) => new RegExp(`\\|\\s*${name}\\s*=\\s*([^\\n]*)`, "i").exec(wikitext)?.[1] ?? "";
  const league = field("league result");
  const pos = /(\d+)(?:st|nd|rd|th)/i.exec(league);
  const managerField = field("manager") || field("chrtitle2") || "";
  const managers = [...managerField.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1].replace(/\s*\([^)]*\)$/, "").trim());
  return { leaguePosition: pos ? Number(pos[1]) : null, managers };
}
