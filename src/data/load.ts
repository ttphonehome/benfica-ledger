import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { cacheLife } from "next/cache";
import type { Dataset } from "./schema";
import { parseDataset } from "./parse";
import type { DataSource } from "./source";
import { jsonDirSource } from "./sources/json-dir";

// Picks the data source. DATA_DIR overrides; otherwise the pipeline's
// snapshot wins when present, and the illustrative placeholder is the fallback.
export function defaultSource(): DataSource {
  if (process.env.DATA_DIR) return jsonDirSource(process.env.DATA_DIR);
  const snapshot = "data/snapshot";
  if (existsSync(path.resolve(process.cwd(), snapshot, "meta.json"))) return jsonDirSource(snapshot);
  return jsonDirSource("data/placeholder");
}

// Loaded once per build and cached; a data update ships as a new deploy.
export async function getDataset(): Promise<Dataset> {
  "use cache";
  cacheLife("max");
  const source = defaultSource();
  return parseDataset(await source.load(), source.name);
}
