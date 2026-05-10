import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  accentColor?: string;
}

export function KPICard({ title, value, trend, icon, accentColor }: KPICardProps) {
  const trendPositive = trend !== undefined && trend >= 0;
  const trendColor = trendPositive ? 'text-green-600' : 'text-red-600';

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-semibold mb-2">{value}</p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                {trendPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: accentColor ? `${accentColor}15` : '#f3f4f6' }}
          >
            <div style={{ color: accentColor || '#6b7280' }}>{icon}</div>
          </div>
        </div>
      </CardContent>
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: accentColor || '#e5e7eb' }}
      />
    </Card>
  );
}
