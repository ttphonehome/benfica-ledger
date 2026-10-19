import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../config";

// Responses are cached in the repo (data/cache) so finished seasons are
// fetched once, and daily runs only spend requests on what can change.

interface Entry<T> {
  fetchedAt: string;
  data: T;
}

const file = (ns: string, key: string) => path.resolve(PATHS.cache, ns, `${key.replace(/[^a-zA-Z0-9._-]+/g, "_")}.json`);

export async function readCache<T>(ns: string, key: string): Promise<Entry<T> | null> {
  try {
    return JSON.parse(await readFile(file(ns, key), "utf8")) as Entry<T>;
  } catch {
    return null;
  }
}

export async function writeCache<T>(ns: string, key: string, data: T): Promise<void> {
  const f = file(ns, key);
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify({ fetchedAt: new Date().toISOString(), data }, null, 1) + "\n");
}

/** Cached value if younger than maxAgeHours (Infinity = keep forever), else fetch and store. */
export async function cached<T>(
  ns: string,
  key: string,
  maxAgeHours: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = await readCache<T>(ns, key);
  if (hit && (maxAgeHours === Infinity || Date.now() - Date.parse(hit.fetchedAt) < maxAgeHours * 3600_000)) return hit.data;
  const data = await fetcher();
  await writeCache(ns, key, data);
  return data;
}
