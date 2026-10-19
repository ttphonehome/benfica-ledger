import type { TransferType } from "../../src/data/schema";

export interface ParsedFee {
  type: TransferType;
  /** €m; null when undisclosed. */
  fee: number | null;
}

// API-Football's transfer "type" is free text: "€ 12M", "€ 500K", "Free",
// "Loan", "Back from Loan", "N/A", "Transfer" and so on. Anything with an
// amount is a permanent deal; a permanent deal without one is undisclosed.
export function parseTransferType(raw: string | null | undefined, dir: "in" | "out"): ParsedFee {
  const t = (raw ?? "").trim();
  const lower = t.toLowerCase();
  if (/back from loan|return from loan|end of loan|loan end/.test(lower)) return { type: "loan-end", fee: null };
  if (/loan/.test(lower)) {
    return { type: dir === "in" ? "loan-in" : "loan-out", fee: null };
  }
  if (/^free|free transfer/.test(lower)) return { type: "free", fee: 0 };
  const m = /([€$£])\s*([\d.,]+)\s*([mk])?/i.exec(t);
  if (m) {
    if (m[1] !== "€") return { type: "permanent", fee: null }; // other currencies: treat as undisclosed rather than guess a rate
    const n = Number(m[2].replace(",", "."));
    const unit = (m[3] ?? "").toLowerCase();
    const millions = unit === "k" ? n / 1000 : unit === "m" ? n : n / 1_000_000;
    return { type: "permanent", fee: Number.isFinite(millions) ? Math.round(millions * 100) / 100 : null };
  }
  return { type: "permanent", fee: null };
}
