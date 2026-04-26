import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { motion } from 'motion/react';

const mockData = [
  { name: 'CCS2 (240kW)', value: 45, color: '#16a34a' },
  { name: 'CHAdeMO (60kW)', value: 30, color: '#f59e0b' },
  { name: 'Type 2 (22kW)', value: 25, color: '#3b82f6' },
];

export function ConnectorTypeChart() {
  const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={mockData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {mockData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--popover-foreground)' }}
            itemStyle={{ color: 'var(--popover-foreground)' }}
            formatter={(value: number) => [`${value}%`, 'Distribution']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
