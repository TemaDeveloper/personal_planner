"use client";

import { PieChart, Pie, Cell } from "recharts";

interface ProgressPieProps {
  completed: number;
  target: number;
  size?: number;
  label?: string;
}

export function ProgressPie({ completed, target, size = 120, label }: ProgressPieProps) {
  const pct = target > 0 ? Math.min(Math.round((completed / target) * 100), 100) : 0;
  const data = [
    { value: completed },
    { value: Math.max(target - completed, 0) },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Pie
            data={data}
            cx={size / 2 - 1}
            cy={size / 2 - 1}
            innerRadius={size * 0.34}
            outerRadius={size * 0.46}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="var(--accent-color)" />
            <Cell fill="var(--surface-2)" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{pct}%</span>
          {label && (
            <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
          )}
        </div>
      </div>
      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        {completed}/{target}
      </p>
    </div>
  );
}
