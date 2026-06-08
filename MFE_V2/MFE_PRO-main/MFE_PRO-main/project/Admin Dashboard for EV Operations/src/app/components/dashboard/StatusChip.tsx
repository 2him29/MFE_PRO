import { Badge } from '../ui/badge';
import {
  StationStatus,
  SessionStatus,
  TicketPriority,
  TicketStatus,
  PaymentStatus,
  AlertSeverity,
} from '../../types';

type Status =
  | StationStatus
  | SessionStatus
  | TicketPriority
  | TicketStatus
  | PaymentStatus
  | AlertSeverity;

interface StatusChipProps {
  status: Status;
  type?: 'station' | 'session' | 'priority' | 'ticket' | 'payment' | 'alert';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Station statuses
  available: {
    label: 'Available',
    className:
      'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-950/50',
  },
  charging: {
    label: 'Charging',
    className:
      'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/50',
  },
  fault: {
    label: 'Fault',
    className:
      'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/50',
  },
  offline: {
    label: 'Offline',
    className:
      'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80',
  },
  maintenance: {
    label: 'Maintenance',
    className:
      'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/50',
  },

  // Session statuses
  active: {
    label: 'Active',
    className:
      'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/50',
  },
  completed: {
    label: 'Completed',
    className:
      'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-950/50',
  },
  stopped: {
    label: 'Stopped',
    className:
      'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80',
  },
  error: {
    label: 'Error',
    className:
      'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/50',
  },

  // Ticket priorities
  low: {
    label: 'Low',
    className:
      'bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80',
  },
  medium: {
    label: 'Medium',
    className:
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300 dark:hover:bg-yellow-950/50',
  },
  high: {
    label: 'High',
    className:
      'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/50',
  },
  critical: {
    label: 'Critical',
    className:
      'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/50',
  },

  // Ticket statuses
  open: {
    label: 'Open',
    className:
      'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/50',
  },
  in_progress: {
    label: 'In Progress',
    className:
      'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-950/50',
  },
  resolved: {
    label: 'Resolved',
    className:
      'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-950/50',
  },
  escalated: {
    label: 'Escalated',
    className:
      'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/50',
  },

  // Payment statuses
  paid: {
    label: 'Paid',
    className:
      'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-950/50',
  },
  unpaid: {
    label: 'Unpaid',
    className:
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300 dark:hover:bg-yellow-950/50',
  },
  refund: {
    label: 'Refund',
    className:
      'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/50',
  },

  // Alert severities
  info: {
    label: 'Info',
    className:
      'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/50',
  },
  warning: {
    label: 'Warning',
    className:
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300 dark:hover:bg-yellow-950/50',
  },
};

export function StatusChip({ status, type }: StatusChipProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <Badge variant="secondary" className={`${config.className} font-medium`}>
      {config.label}
    </Badge>
  );
}
