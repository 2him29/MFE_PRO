import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  accentColor?: string;
  onClick?: () => void;
}

export function KPICard({ title, value, trend, icon, accentColor, onClick }: KPICardProps) {
  const trendPositive = trend !== undefined && trend >= 0;
  const trendColor = trendPositive ? 'text-green-600' : 'text-red-600';

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 truncate">{title}</p>
            <p className="text-2xl font-bold mb-1.5">{value}</p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                {trendPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 ml-2">
            <div
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: accentColor ? `${accentColor}15` : '#f3f4f6' }}
            >
              <div style={{ color: accentColor || '#6b7280' }}>{icon}</div>
            </div>
            {onClick && (
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            )}
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
