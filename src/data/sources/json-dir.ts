import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DataSource } from "../source";

// One JSON file per dataset, as written by scripts/import-reference.mjs and,
// later, by the data pipeline. File names are kebab-case dataset keys.
const FILES = {
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
} as const;

export function jsonDirSource(dir: string): DataSource {
  const root = path.resolve(process.cwd(), dir);
  return {
    name: `json:${dir}`,
    async load() {
      const entries = await Promise.all(
        Object.entries(FILES).map(async ([key, file]) => {
          const full = path.join(root, file);
          let text: string;
          try {
            text = await readFile(full, "utf8");
          } catch (err) {
            throw new Error(`Missing data file ${full}`, { cause: err });
          }
          try {
            return [key, JSON.parse(text)] as const;
          } catch (err) {
            throw new Error(`Invalid JSON in ${full}`, { cause: err });
          }
        }),
      );
      return Object.fromEntries(entries);
    },
  };
}
