import type { Position } from "@/data/schema";
import { positionGroup, type PositionGroup } from "@/lib/stats/positions";
import type { Lang } from "./config";

// Locale-aware formatting. Inputs are exact numbers; rounding happens here.
// Money is in millions of euros: English "€12m", Portuguese "12 M€".

export const DASH = "—";
const MINUS = "−";

export interface Formatters {
  lang: Lang;
  /** Plain number with fixed decimals: 7.27 / 7,27 */
  num(n: number, digits?: number): string;
  /** Whole-number percentage: 56% */
  pct(n: number | null | undefined): string;
  /** A single fee: €0.9m / 0,9 M€ */
  money(m: number | null | undefined): string;
  /** A whole-€m total: €105m / 105 M€ */
  total(m: number): string;
  /** A signed whole-€m balance: +€47m / +47 M€ */
  net(m: number): string;
  /** €m with one decimal: €11.4m / 11,4 M€ */
  money1(m: number): string;
  mins(n: number | null | undefined): string;
  rating(r: number | null | undefined): string;
  /** 2023-01-09 -> Jan 09, 2023 / 09/01/2023 */
  day(iso: string | null): string;
  /** 2023-01-09 -> Jan 2023 / jan. 2023 */
  month(iso: string | null): string;
  /** 1 -> 1st / 1.º */
  ordinal(n: number): string;
  pos(p: Position): string;
  group(p: Position): string;
}

const POS_PT: Record<Position, string> = {
  GK: "GR", CB: "DC", LB: "DE", RB: "DD", LWB: "AE", RWB: "AD", DF: "DEF", DM: "MDC", CM: "MC", AM: "MO",
  LM: "ME", RM: "MD", MF: "MED", LW: "EE", RW: "ED", ST: "PL", FW: "AV",
};
const GROUP: Record<Lang, Record<PositionGroup, string>> = {
  en: { GK: "GK", DEF: "DEF", MID: "MID", ATT: "ATT" },
  pt: { GK: "GR", DEF: "DEF", MID: "MED", ATT: "AV" },
};
const MONTHS: Record<Lang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  pt: ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."],
};

export function formatters(lang: Lang): Formatters {
  const pt = lang === "pt";
  const num = (n: number, digits = 0) => {
    const s = n.toFixed(digits);
    return pt ? s.replace(".", ",") : s;
  };
  const eur = (abs: string) => (pt ? `${abs} M€` : `€${abs}m`);
  const f: Formatters = {
    lang,
    num,
    pct: (n) => (n == null ? DASH : `${Math.round(n)}%`),
    money(m) {
      if (m == null) return DASH;
      if (m === 0) return pt ? "0 €" : "€0";
      const abs = Math.abs(m);
      return (m < 0 ? MINUS : "") + eur(abs >= 10 ? num(abs, 0) : num(abs, 1));
    },
    total: (m) => eur(String(Math.round(m))),
    net(m) {
      const r = Math.round(m);
      if (r === 0) return pt ? "0 €" : "€0";
      return (r > 0 ? "+" : MINUS) + eur(String(Math.abs(r)));
    },
    money1: (m) => eur(num(m, 1)),
    mins: (n) => (n == null ? DASH : n.toLocaleString(pt ? "pt-PT" : "en-GB")),
    rating: (r) => (r == null ? DASH : num(r, 1)),
    day(iso) {
      if (!iso) return DASH;
      const [y, m, d] = iso.split("-");
      return pt ? `${d}/${m}/${y}` : `${MONTHS.en[Number(m) - 1]} ${d}, ${y}`;
    },
    month(iso) {
      if (!iso) return DASH;
      const [y, m] = iso.split("-");
      return `${MONTHS[lang][Number(m) - 1]} ${y}`;
    },
    ordinal(n) {
      if (pt) return `${n}.º`;
      const s = ["th", "st", "nd", "rd"], v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },
    pos: (p) => (pt ? POS_PT[p] : p),
    group: (p) => GROUP[lang][positionGroup(p)],
  };
  return f;
}
