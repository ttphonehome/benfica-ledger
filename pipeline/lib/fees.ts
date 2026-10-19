import type { TransferType } from "../../src/data/schema";

export interface ParsedFee {
  type: TransferType;
  /** €m; null when undisclosed. */
  fee: number | null;
}

// API-Football's transfer "type" is free text. Seen in Benfica's history:
// "€ 12M", "1.6M €", "750K", "7M", "€ 243.5K", "Loan", "Back from Loan",
// "Return from loan", "Free", "€ Free", "Free Transfer", "Free agent",
// "N/A", "€ N/A", "Transfer", "Swap", "Raise", "-" and null.
// An amount means a permanent deal; a permanent deal without one is
// undisclosed (null), never zero.
export function parseTransferType(raw: string | null | undefined, dir: "in" | "out"): ParsedFee {
  const t = (raw ?? "").trim();
  const lower = t.toLowerCase();
  if (/back from loan|return from loan|end of loan|loan end/.test(lower)) return { type: "loan-end", fee: null };
  if (/loan/.test(lower)) return { type: dir === "in" ? "loan-in" : "loan-out", fee: null };
  if (/\bfree\b/.test(lower)) return { type: "free", fee: 0 };
  if (/[£$]/.test(t)) return { type: "permanent", fee: null }; // other currencies: don't guess a rate
  const m = /(\d+(?:[.,]\d+)?)\s*([mk])\b/i.exec(t);
  if (m) {
    const n = Number(m[1].replace(",", "."));
    const millions = m[2].toLowerCase() === "k" ? n / 1000 : n;
    return { type: "permanent", fee: Math.round(millions * 1000) / 1000 };
  }
  return { type: "permanent", fee: null };
}
