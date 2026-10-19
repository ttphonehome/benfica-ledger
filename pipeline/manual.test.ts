import { describe, expect, it } from "vitest";
import { loadManual } from "./manual";

describe("manual inputs", () => {
  it("loads and validates the seeded files", async () => {
    const m = await loadManual();
    expect(m.managers.map((x) => x.id)).toContain("marco-silva");
    expect(m.managers.find((x) => x.id === "lage-2")).toMatchObject({ departed: null, verified: false });
    expect(m["manager-notes"].find((x) => x.manager_id === "lage-1" && x.season === "2018-19")?.youth_promoted).toContain("Rúben Dias");
    expect(m.academy.length).toBeGreaterThan(20);
    expect(m.overrides).toEqual([]);
  });
});
