import type { Dataset } from "./schema";

// A data source returns raw, unvalidated data in the Dataset shape. The loader
// validates it, so a new source (CSV import, an API, a database) only has to
// produce the shape. See sources/ for implementations.
export interface DataSource {
  /** Short label shown in error messages, e.g. "json:data/snapshot". */
  readonly name: string;
  load(): Promise<unknown>;
}

export type { Dataset };
