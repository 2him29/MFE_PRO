import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
  details?: string;
}

interface ActivityLogProps {
  activities: ActivityItem[];
  title?: string;
  compact?: boolean;
}

export function ActivityLog({
  activities,
  title = 'Recent Activity',
  compact = false,
}: ActivityLogProps) {
  return (
    <Card>
      <CardHeader className={compact ? 'pb-3' : ''}>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`flex gap-3 ${
                  index !== activities.length - 1 ? 'pb-4 border-b' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    by {activity.user} - {format(activity.timestamp, 'MMM dd, yyyy HH:mm')}
                  </p>
                  {activity.details && !compact && (
                    <p className="text-xs text-gray-600 mt-2">{activity.details}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
