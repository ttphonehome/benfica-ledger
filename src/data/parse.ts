import { z } from "zod";
import { datasetSchema, type Dataset } from "./schema";
import { integrityProblems } from "./integrity";

/** Validates raw source output: row schemas first, then cross-row integrity. */
export function parseDataset(raw: unknown, sourceName: string): Dataset {
  const parsed = datasetSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Data from ${sourceName} failed validation:\n${z.prettifyError(parsed.error)}`);
  }
  const problems = integrityProblems(parsed.data);
  if (problems.length) {
    throw new Error(`Data from ${sourceName} is inconsistent:\n- ${problems.join("\n- ")}`);
  }
  return parsed.data;
}
