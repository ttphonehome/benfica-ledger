import type { Row } from "@tanstack/react-table";

// Text columns sort with localeCompare so accented names (Álvaro, Ángel)
// sort where a Portuguese reader expects them.
export function localeText<T>(a: Row<T>, b: Row<T>, id: string): number {
  return String(a.getValue(id) ?? "").localeCompare(String(b.getValue(id) ?? ""), "pt");
}
