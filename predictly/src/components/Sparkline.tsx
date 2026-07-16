'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}

export default function Sparkline({ data, positive, width = 120, height = 40 }: Props) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={positive ? '#22c55e' : '#ef4444'}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
