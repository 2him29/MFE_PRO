import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'motion/react';
import { TrendPoint } from '../../lib/api';

interface RevenueTrendChartProps {
  accentColor?: string;
  data: TrendPoint[];
}

export function RevenueTrendChart({ accentColor = '#16a34a', data }: RevenueTrendChartProps) {
  const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
  };

  const formatted = data.map((d) => ({
    ...d,
    date: d.date ? new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : d.date,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full h-full"
    >
      {formatted.length === 0 ? (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          No session data for this period yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
            <YAxis
              yAxisId="left"
              stroke={accentColor}
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#3b82f6"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: 'var(--popover-foreground)' }}
              itemStyle={{ color: 'var(--popover-foreground)' }}
              formatter={(value: number, name: string) => {
                if (name === 'revenue') return [`${value.toLocaleString()} DZD`, 'Revenue'];
                if (name === 'energy')  return [`${value.toLocaleString()} kWh`, 'Energy'];
                return value;
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                if (value === 'revenue') return 'Revenue (DZD)';
                if (value === 'energy')  return 'Energy (kWh)';
                return value;
              }}
            />
            <Line yAxisId="left"  type="monotone" dataKey="revenue" stroke={accentColor} strokeWidth={3} dot={{ fill: accentColor, r: 4 }} activeDot={{ r: 6 }} />
            <Line yAxisId="right" type="monotone" dataKey="energy"  stroke="#3b82f6"     strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }}     activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
