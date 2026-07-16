'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

interface Order {
  side: string;
  price: number;
  contracts: number;
  createdAt: string;
}

interface Props {
  orders: Order[];
  currentYesPrice: number;
}

export default function PriceChart({ orders, currentYesPrice }: Props) {
  if (orders.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        No trade history yet. Be the first to trade!
      </div>
    );
  }

  // Build YES price timeline from filled orders
  const sortedOrders = [...orders].reverse();
  let runningPrice = currentYesPrice;
  const data = sortedOrders.map((o, i) => {
    if (o.side === 'YES') runningPrice = o.price;
    else runningPrice = 1 - o.price;
    return {
      index: i,
      time: format(new Date(o.createdAt), 'MMM d HH:mm'),
      yesPrice: parseFloat((runningPrice * 100).toFixed(1)),
    };
  });

  // Add current point
  data.push({
    index: data.length,
    time: 'Now',
    yesPrice: parseFloat((currentYesPrice * 100).toFixed(1)),
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: '#6b7280' }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}¢`}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
          formatter={(value: number) => [`${value}¢`, 'YES Price']}
        />
        <ReferenceLine y={50} stroke="#374151" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="yesPrice"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#22c55e' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
