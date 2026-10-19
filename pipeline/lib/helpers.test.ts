import { describe, expect, it } from "vitest";
import { parseTransferType } from "./fees";
import { seasonOfDate, windowSeason } from "./seasons";
import { parseCsv } from "./csv";
import { nationCode } from "./nations";

describe("pipeline helpers", () => {
  it("parses API-Football transfer types", () => {
    expect(parseTransferType("€ 12M", "in")).toEqual({ type: "permanent", fee: 12 });
    expect(parseTransferType("€ 7.18M", "out")).toEqual({ type: "permanent", fee: 7.18 });
    expect(parseTransferType("€ 500K", "out")).toEqual({ type: "permanent", fee: 0.5 });
    expect(parseTransferType("Loan", "in")).toEqual({ type: "loan-in", fee: null });
    expect(parseTransferType("Loan", "out")).toEqual({ type: "loan-out", fee: null });
    expect(parseTransferType("Back from Loan", "in")).toEqual({ type: "loan-end", fee: null });
    expect(parseTransferType("Free", "in")).toEqual({ type: "free", fee: 0 });
    expect(parseTransferType("N/A", "in")).toEqual({ type: "permanent", fee: null });
    expect(parseTransferType("£ 30M", "out")).toEqual({ type: "permanent", fee: null });
    expect(parseTransferType("1.6M €", "in")).toEqual({ type: "permanent", fee: 1.6 });
    expect(parseTransferType("750K", "out")).toEqual({ type: "permanent", fee: 0.75 });
    expect(parseTransferType("€ 243.5K", "out")).toEqual({ type: "permanent", fee: 0.244 });
    expect(parseTransferType("7M", "in")).toEqual({ type: "permanent", fee: 7 });
    expect(parseTransferType("€ Free", "in")).toEqual({ type: "free", fee: 0 });
    expect(parseTransferType("Free agent", "in")).toEqual({ type: "free", fee: 0 });
    expect(parseTransferType("Return from loan", "in")).toEqual({ type: "loan-end", fee: null });
    for (const x of ["€ N/A", "Transfer", "Swap", "Raise", "-", null]) expect(parseTransferType(x, "in")).toEqual({ type: "permanent", fee: null });
  });

  it("assigns dates to seasons and windows", () => {
    expect(seasonOfDate("2025-07-01")).toBe("2025-26");
    expect(seasonOfDate("2026-06-30")).toBe("2025-26");
    expect(windowSeason("2025-06-02")).toBe("2025-26");
    expect(windowSeason("2026-01-31")).toBe("2025-26");
  });

  it("reads CSV with quotes and comments", () => {
    expect(parseCsv('# note\nname,note\n"Silva, A","said ""hi"""\n\n')).toEqual([{ name: "Silva, A", note: 'said "hi"' }]);
  });

  it("maps nationalities", () => {
    expect(nationCode("Portugal")).toBe("POR");
    expect(nationCode("Bosnia & Herzegovina")).toBe("BIH");
    expect(nationCode(null)).toBeNull();
  });
});
