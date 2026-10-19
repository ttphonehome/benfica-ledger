// Points-per-game line across a manager's seasons, on a fixed 1.5-3.0 scale.
export function PpgTrend({ points }: { points: { season: string; ppg: number }[] }) {
  const W = 720, H = 140, PADX = 36, PADY = 26;
  const innerW = W - PADX * 2, innerH = H - PADY * 2;
  const min = 1.5, max = 3;
  const x = (i: number) => PADX + (i / Math.max(1, points.length - 1)) * innerW;
  const y = (v: number) => PADY + (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min)) * innerH;
  const path = points.map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.ppg)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block max-h-40 w-full" role="img"
      aria-label={`Points per game: ${points.map((p) => `${p.season} ${p.ppg.toFixed(2)}`).join(", ")}`}>
      {[1.5, 2, 2.5, 3].map((v) => (
        <g key={v}>
          <line x1={PADX} x2={W - PADX} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeDasharray={v === 2 ? undefined : "2 3"} />
          <text x={PADX - 6} y={y(v) + 3} fontFamily="var(--font-mono)" fontSize="10" fill="var(--mute)" textAnchor="end">{v.toFixed(1)}</text>
        </g>
      ))}
      <path d={path} stroke="var(--ink)" strokeWidth="1.5" fill="none" />
      {points.map((p, i) => (
        <g key={p.season}>
          <circle cx={x(i)} cy={y(p.ppg)} r="3.5" fill="var(--ink)" />
          <text x={x(i)} y={y(p.ppg) - 10} fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink)" textAnchor="middle">{p.ppg.toFixed(2)}</text>
          <text x={x(i)} y={H - 8} fontFamily="var(--font-mono)" fontSize="10" fill="var(--mute)" textAnchor="middle">{p.season}</text>
        </g>
      ))}
    </svg>
  );
}
