import { describe, expect, it } from "vitest";
import { en } from "./dictionaries/en";
import { pt } from "./dictionaries/pt";
import { getI18n } from "./index";

describe("i18n", () => {
  it("pt has every key and the same placeholders as en", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(pt[key], key).toBeTypeOf("string");
      const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
      expect(ph(pt[key]), key).toBe(ph(en[key]));
    }
  });

  it("fills placeholders and plurals", () => {
    const { t, tp } = getI18n("pt");
    expect(t("roster.count", { n: 3, total: 32 })).toBe("3 de 32 jogadores");
    expect(tp("apps", 1)).toBe("1 jogo");
    expect(tp("apps", 0)).toBe("0 jogos");
    expect(getI18n("en").tp("apps", 1)).toBe("1 app");
  });

  it("formats money, numbers and dates per language", () => {
    const pt_ = getI18n("pt").f, en_ = getI18n("en").f;
    expect([pt_.money(0.9), pt_.money(22.8), pt_.net(-5), pt_.total(105), pt_.money1(11.43)]).toEqual(["0,9 M€", "23 M€", "−5 M€", "105 M€", "11,4 M€"]);
    expect([en_.money(0.9), en_.net(47), en_.total(105)]).toEqual(["€0.9m", "+€47m", "€105m"]);
    expect([pt_.day("2023-01-09"), en_.day("2023-01-09")]).toEqual(["09/01/2023", "Jan 09, 2023"]);
    expect([pt_.month("2024-06-15"), pt_.ordinal(2), en_.ordinal(2)]).toEqual(["jun. 2024", "2.º", "2nd"]);
    expect([pt_.pos("GK"), pt_.pos("ST"), pt_.group("CB"), en_.group("ST")]).toEqual(["GR", "PL", "DEF", "ATT"]);
  });
});
