import path from "node:path";
import { z } from "zod";
import { PATHS } from "./config";
import { readCsv } from "./lib/csv";
import { POSITIONS, seasonId } from "../src/data/schema";

// Hand-kept inputs in data/manual. Each file is validated row by row so a
// typo fails the run with the file and line, instead of reaching the site.

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const optDate = z.union([date, z.literal("")]).transform((v) => v || null);
const yesNo = z.enum(["yes", "no", ""]).transform((v) => v === "yes");
const optText = z.string().transform((v) => v || null);

const rows = {
  academy: z.object({ player: z.string().min(1), source: z.string(), verified: yesNo }),
  profiles: z.object({
    player: z.string().min(1),
    primary: z.enum(POSITIONS),
    secondary: z.union([z.enum(POSITIONS), z.literal("")]).transform((v) => v || null),
    foot: z.enum(["L", "R", "B"]),
    role: z.string(),
    source: z.string(),
    verified: yesNo,
  }),
  managers: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/, "lower-case id with dashes"),
    name: z.string().min(1),
    nick: z.string().min(1),
    appointed: date,
    departed: optDate,
    source: z.string(),
    verified: yesNo,
  }),
  "manager-notes": z.object({
    manager_id: z.string().min(1),
    season: seasonId,
    notes: z.string(),
    youth_promoted: z.string().transform((v) => v.split(";").map((x) => x.trim()).filter(Boolean)),
    source: z.string(),
  }),
  presidents: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    nick: z.string().min(1),
    appointed: date,
    departed: optDate,
    notes: z.string(),
    source: z.string(),
    verified: yesNo,
  }),
  "president-notes": z.object({ president_id: z.string().min(1), season: seasonId, notes: z.string(), source: z.string() }),
  "manager-hires": z.object({
    president_id: z.string().min(1),
    manager_id: z.string().min(1),
    verdict: z.enum(["good", "neutral", "bad"]),
    note: z.string(),
  }),
  overrides: z
    .object({
      kind: z.enum(["fee", "rating", "assists", "minutes"]),
      player: z.string().min(1),
      season: seasonId,
      dir: z.enum(["in", "out", ""]).transform((v) => v || null),
      value: z.coerce.number().nonnegative(),
      source_name: z.string().min(1, "say where the number comes from"),
      source_url: z.url("give a link to the source"),
      note: optText,
    })
    .refine((r) => r.kind !== "fee" || r.dir, { message: "fee overrides need dir in or out" }),
  titles: z.object({ season: seasonId, competition: z.string().min(1), source_url: optText }),
  notes: z.object({ player: z.string().min(1), text: z.string().min(1), source: z.string() }),
  "player-aliases": z.object({ alias: z.string().min(1), name: z.string().min(1) }),
} as const;

type Rows = typeof rows;
export type Manual = { [K in keyof Rows]: z.output<Rows[K]>[] };

export async function loadManual(dir: string = PATHS.manual): Promise<Manual> {
  const out: Partial<Manual> = {};
  const problems: string[] = [];
  for (const [name, schema] of Object.entries(rows) as [keyof Rows, Rows[keyof Rows]][]) {
    const file = path.join(dir, `${name}.csv`);
    const raw = await readCsv(file);
    const parsed: unknown[] = [];
    raw.forEach((r, i) => {
      const res = schema.safeParse(r);
      if (res.success) parsed.push(res.data);
      else problems.push(`${file} row ${i + 1}: ${res.error.issues.map((x) => `${x.path.join(".") || "row"} ${x.message}`).join("; ")}`);
    });
    (out as Record<string, unknown[]>)[name] = parsed;
  }
  if (problems.length) throw new Error(`Problems in data/manual:\n- ${problems.join("\n- ")}`);
  return out as Manual;
}
