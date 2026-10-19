import type { Position } from "@/data/schema";

export type PositionGroup = "GK" | "DEF" | "MID" | "ATT";

const DEF: Position[] = ["CB", "LB", "RB", "LWB", "RWB", "DF"];
const MID: Position[] = ["DM", "CM", "AM", "LM", "RM", "MF"];

export function positionGroup(pos: Position): PositionGroup {
  if (pos === "GK") return "GK";
  if (DEF.includes(pos)) return "DEF";
  if (MID.includes(pos)) return "MID";
  return "ATT";
}
