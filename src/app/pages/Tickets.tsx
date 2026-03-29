import { useState } from 'react';
import { Plus, Calendar, User } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { SideDrawer } from '../components/dashboard/SideDrawer';
import { ActivityLog } from '../components/dashboard/ActivityLog';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { mockTickets } from '../data/mockData';
import { Ticket, TicketActivity } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const mockTicketActivities: TicketActivity[] = [
  {
    id: '1',
    action: 'Ticket created',
    user: 'System',
    timestamp: new Date(Date.now() - 7200000),
    details: 'Automatically created from station alert',
  },
  {
    id: '2',
    action: 'Assigned to Ahmed Benali',
    user: 'Supervisor',
    timestamp: new Date(Date.now() - 5400000),
    details: 'Priority set to high',
  },
  {
    id: '3',
    action: 'Status updated to In Progress',
    user: 'Ahmed Benali',
    timestamp: new Date(Date.now() - 3600000),
    details: 'Started diagnostics',
  },
  {
    id: '4',
    action: 'Comment added',
    user: 'Ahmed Benali',
    timestamp: new Date(Date.now() - 1800000),
    details: 'Connector hardware issue identified',
  },
];

export default function Tickets() {
  const { currentTenant } = useTenant();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredTickets = mockTickets.filter((ticket) => {
    if (currentTenant && ticket.tenantId !== currentTenant.id) return false;
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (
      searchValue &&
      !ticket.title.toLowerCase().includes(searchValue.toLowerCase()) &&
      !ticket.stationName.toLowerCase().includes(searchValue.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
  };

  const getSLAColor = (deadline: Date) => {
    const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining < 2) return 'text-red-600';
    if (hoursRemaining < 4) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Tickets & Incidents</h1>
          <p className="text-gray-500 mt-1">Track and resolve station issues</p>
        </div>
        <Button onClick={() => toast.success('New ticket form opened')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      <Card>
        <FilterBar
          searchPlaceholder="Search by title or station..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'Open', value: 'open' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Resolved', value: 'resolved' },
                { label: 'Escalated', value: 'escalated' },
              ],
              onChange: setStatusFilter,
            },
            {
              label: 'Priority',
              value: priorityFilter,
              options: [
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Critical', value: 'critical' },
              ],
              onChange: setPriorityFilter,
            },
          ]}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>SLA Deadline</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewTicket(ticket)}
                  >
                    <TableCell>
                      <span className="font-mono text-sm">{ticket.id}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{ticket.title}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{ticket.stationName}</span>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={ticket.priority} type="priority" />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={ticket.status} type="ticket" />
                    </TableCell>
                    <TableCell>
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{ticket.assignedTo}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Unassigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className={`text-sm ${getSLAColor(ticket.slaDeadline)}`}>
                          {formatDistanceToNow(ticket.slaDeadline, { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {format(ticket.createdAt, 'MMM dd, HH:mm')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTicket(ticket);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Ticket Detail Drawer */}
      <SideDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selectedTicket?.title || 'Ticket Details'}
        description={selectedTicket?.id}
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Status & Priority */}
            <div className="flex items-center gap-3">
              <StatusChip status={selectedTicket.status} type="ticket" />
              <StatusChip status={selectedTicket.priority} type="priority" />
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-gray-600">{selectedTicket.description}</p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Station</p>
                <p className="text-sm font-medium">{selectedTicket.stationName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                <p className="text-sm font-medium">
                  {selectedTicket.assignedTo || 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Created</p>
                <p className="text-sm font-medium">
                  {format(selectedTicket.createdAt, 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">SLA Deadline</p>
                <p className={`text-sm font-medium ${getSLAColor(selectedTicket.slaDeadline)}`}>
                  {format(selectedTicket.slaDeadline, 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>

            {/* Activity Timeline */}
            <ActivityLog activities={mockTicketActivities} title="Activity Timeline" />

            {/* Actions */}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => toast.success('Ticket updated')}>
                Update Status
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => toast.success('Comment added')}
              >
                Add Comment
              </Button>
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
}
