"use client";

import { useScrollIntoViewX } from "@/hooks/use-scroll-into-view-x";
import { useRouter } from "next/navigation";
import { fmtNet } from "@/lib/format";

export interface NetSpendPoint {
  season: string;
  spent: number;
  received: number;
  net: number;
}

// Paired spent/received bars per season with the net written above.
// Clicking a season opens that season's overview.
export function NetSpendChart({ data, current }: { data: NetSpendPoint[]; current: string }) {
  const router = useRouter();
  // On narrow screens the chart scrolls sideways; keep the selected season in view.
  const activeRef = useScrollIntoViewX<SVGRectElement>(current);
  const W = 760, H = 220, PADX = 36, PADY = 24;
  const innerW = W - PADX * 2, innerH = H - PADY * 2;
  const max = Math.max(1, ...data.map((d) => Math.max(d.spent, d.received)));
  const groupW = innerW / data.length;
  const barW = groupW * 0.36;
  const y = (v: number) => PADY + innerH - (v / max) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block max-h-60 w-full" role="img" aria-label="Spent and received per season">
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <g key={p}>
          <line x1={PADX} x2={W - PADX} y1={y(max * p)} y2={y(max * p)} stroke="var(--rule)" strokeDasharray={i === 0 ? undefined : "2 3"} />
          <text x={PADX - 6} y={y(max * p) + 3} textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--mute)">
            €{Math.round(max * p)}m
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = PADX + groupW * i + groupW / 2;
        const active = d.season === current;
        const netY = d.net >= 0 ? y(d.net) : y(0);
        return (
          <g
            key={d.season}
            role="link"
            tabIndex={0}
            aria-label={`${d.season}: spent €${d.spent}m, received €${d.received}m, net ${fmtNet(d.net)}`}
            className="cursor-pointer outline-none focus-visible:[&>rect:first-child]:stroke-ring"
            onClick={() => router.push(`/${d.season}`, { scroll: false })}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && router.push(`/${d.season}`, { scroll: false })}
          >
            <rect ref={active ? activeRef : undefined} x={cx - groupW / 2 + 6} y={PADY} width={groupW - 12} height={innerH} fill={active ? "var(--paper-2)" : "transparent"} />
            <title>{`${d.season}: spent €${d.spent}m, received €${d.received}m`}</title>
            <rect x={cx - barW - 2} y={y(d.spent)} width={barW} height={innerH + PADY - y(d.spent)} fill="var(--bad)" opacity={active ? 1 : 0.85} />
            <rect x={cx + 2} y={y(d.received)} width={barW} height={innerH + PADY - y(d.received)} fill="var(--good)" opacity={active ? 1 : 0.85} />
            <line x1={cx - barW - 4} x2={cx + barW + 4} y1={netY} y2={netY} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.5" />
            <text x={cx} y={H - 6} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={active ? "var(--ink)" : "var(--mute)"} fontWeight={active ? 600 : 400}>
              {d.season}
            </text>
            <text x={cx} y={PADY - 8} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fontWeight={500} fill={d.net < 0 ? "var(--bad)" : "var(--good)"}>
              {fmtNet(d.net)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
