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
  available: { label: 'Available', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  charging: { label: 'Charging', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  fault: { label: 'Fault', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  offline: { label: 'Offline', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },

  // Session statuses
  active: { label: 'Active', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  stopped: { label: 'Stopped', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  error: { label: 'Error', className: 'bg-red-100 text-red-800 hover:bg-red-100' },

  // Ticket priorities
  low: { label: 'Low', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800 hover:bg-red-100' },

  // Ticket statuses
  open: { label: 'Open', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  in_progress: {
    label: 'In Progress',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  escalated: { label: 'Escalated', className: 'bg-red-100 text-red-800 hover:bg-red-100' },

  // Payment statuses
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  unpaid: { label: 'Unpaid', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  refund: { label: 'Refund', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },

  // Alert severities
  info: { label: 'Info', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  warning: { label: 'Warning', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
};

export function StatusChip({ status, type }: StatusChipProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge variant="secondary" className={`${config.className} font-medium`}>
      {config.label}
    </Badge>
  );
}
