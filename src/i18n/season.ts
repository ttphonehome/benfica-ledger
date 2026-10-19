import type { SeasonContext } from "@/data/schema";
import { DASH } from "./format";
import type { I18n } from "./index";

/** "2.º na Primeira Liga (após 6 jornadas)" / "2nd, Primeira Liga (after 6 rounds)" */
export function finishText(ctx: SeasonContext | undefined, { t, f }: I18n, withNote = true): string {
  if (!ctx || ctx.leaguePosition == null) return DASH;
  const base = t("overview.finish", { pos: f.ordinal(ctx.leaguePosition) });
  return withNote && ctx.leagueNote ? `${base} (${ctx.leagueNote})` : base;
}
