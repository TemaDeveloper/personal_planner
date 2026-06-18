"use client";

/** Small Notion-style progress ring (used by percent rollups). `value` is 0..1. */
export function ProgressRing({ value, size = 18 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const r = (size - 3) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-default)" strokeWidth={2.5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-color)" strokeWidth={2.5}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{Math.round(pct * 100)}%</span>
    </span>
  );
}
