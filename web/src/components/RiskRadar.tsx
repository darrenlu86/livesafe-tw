"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

const PALETTE = [
  "#a855f7",
  "#06b6d4",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
];

export interface RadarPoint {
  dimension: string;
  [series: string]: string | number;
}

interface Props {
  data: RadarPoint[];
  series: Array<{ name: string; color?: string }>;
  height?: number;
}

export function RiskRadar({ data, series, height = 360 }: Props) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="rgba(255,255,255,0.12)" strokeDasharray="2 4" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 13 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          {series.map((s, i) => {
            const color = s.color ?? PALETTE[i % PALETTE.length];
            return (
              <Radar
                key={s.name}
                name={s.name}
                dataKey={s.name}
                stroke={color}
                fill={color}
                fillOpacity={series.length === 1 ? 0.28 : 0.18}
                strokeWidth={2}
                isAnimationActive
              />
            );
          })}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
