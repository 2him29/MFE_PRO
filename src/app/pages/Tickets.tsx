import { useMemo, useState, useEffect } from 'react';
import { Plus, Calendar, User } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { SideDrawer } from '../components/dashboard/SideDrawer';
import { ActivityLog } from '../components/dashboard/ActivityLog';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { TableSkeleton } from '../components/dashboard/LoadingState';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Ticket, TicketActivity, TicketCategory, TicketStatus } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { loadUsers } from '../data/userStore';
import { loadTickets, saveTickets } from '../data/ticketStore';

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
    action: 'Assigned to Yasmine Hadj',
    user: 'Nadia Amara',
    timestamp: new Date(Date.now() - 5400000),
    details: 'Priority set to high',
  },
  {
    id: '3',
    action: 'Status updated to In Progress',
    user: 'Yasmine Hadj',
    timestamp: new Date(Date.now() - 3600000),
    details: 'Started diagnostics',
  },
  {
    id: '4',
    action: 'Comment added',
    user: 'Yasmine Hadj',
    timestamp: new Date(Date.now() - 1800000),
    details: 'Connector hardware issue identified',
  },
];

const categoryLabels: Record<string, string> = {
  power_failure: 'Power Failure',
  screen_issue: 'Screen Issue',
  charger_fault: 'Charger Fault',
  system_failure: 'System Failure',
  network_issue: 'Network Issue',
  maintenance: 'Maintenance',
};

export default function Tickets() {
  const { currentTenant, currentUser } = useTenant();
  const users = useMemo(() => loadUsers(), []);
  const [tickets, setTickets] = useState<Ticket[]>(() => loadTickets());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1300);
    return () => clearTimeout(t);
  }, []);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionDrawer, setActionDrawer] = useState<{
    open: boolean;
    mode: 'create' | 'status' | 'comment';
    ticket: Ticket | null;
  }>({ open: false, mode: 'create', ticket: null });
  const [title, setTitle] = useState('');
  const [stationName, setStationName] = useState('');
  const [category, setCategory] = useState<TicketCategory>('charger_fault');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>(
    'medium'
  );
  const [assignedToId, setAssignedToId] = useState('unassigned');
  const [description, setDescription] = useState('');
  const [statusUpdate, setStatusUpdate] = useState<TicketStatus>('open');
  const [note, setNote] = useState('');

  const filteredTickets = tickets.filter((ticket) => {
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

  const handleOpenCreate = () => {
    setTitle('');
    setStationName('');
    setCategory('charger_fault');
    setPriority('medium');
    setAssignedToId('unassigned');
    setDescription('');
    setActionDrawer({ open: true, mode: 'create', ticket: null });
  };

  const handleOpenStatus = (ticket: Ticket) => {
    setStatusUpdate(ticket.status);
    setNote('');
    setActionDrawer({ open: true, mode: 'status', ticket });
  };

  const handleOpenComment = (ticket: Ticket) => {
    setNote('');
    setActionDrawer({ open: true, mode: 'comment', ticket });
  };

  const getSLAColor = (deadline: Date) => {
    const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining < 2) return 'text-red-600';
    if (hoursRemaining < 4) return 'text-orange-600';
    return 'text-green-600';
  };

  const assignableUsers = users.filter((user) => {
    if (currentTenant && user.tenantId !== currentTenant.id) return false;
    if (user.status === 'suspended') return false;
    return user.role !== 'super_admin';
  });

  const getSlaHoursByPriority = (value: Ticket['priority']) => {
    if (value === 'critical') return 2;
    if (value === 'high') return 4;
    if (value === 'medium') return 12;
    return 24;
  };

  const persistTickets = (nextTickets: Ticket[]) => {
    setTickets(nextTickets);
    saveTickets(nextTickets);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Tasks & Incidents</h1>
          <p className="text-gray-500 mt-1">Assign teams and track station issues</p>
        </div>
        <Button onClick={handleOpenCreate}>
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
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>SLA Deadline</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton cols={10} />
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
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
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[ticket.category] || 'General'}
                      </Badge>
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
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <p className="text-sm font-medium">
                  {categoryLabels[selectedTicket.category] || 'General'}
                </p>
              </div>
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
                <p className="text-xs text-gray-500 mb-1">Created By</p>
                <p className="text-sm font-medium">
                  {selectedTicket.createdBy || 'System'}
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
              <Button
                className="flex-1"
                onClick={() => selectedTicket && handleOpenStatus(selectedTicket)}
              >
                Update Status
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => selectedTicket && handleOpenComment(selectedTicket)}
              >
                Add Comment
              </Button>
            </div>
          </div>
        )}
      </SideDrawer>

      <SideDrawer
        open={actionDrawer.open}
        onOpenChange={(open) => setActionDrawer((prev) => ({ ...prev, open }))}
        title={
          actionDrawer.mode === 'create'
            ? 'Create Task'
            : actionDrawer.mode === 'status'
              ? 'Update Status'
              : 'Add Field Report'
        }
        description={
          actionDrawer.mode === 'create'
            ? 'Assign a task to a technician'
            : actionDrawer.ticket?.id
        }
      >
        {actionDrawer.mode === 'create' && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const now = new Date();
              const selectedAssignee = assignableUsers.find(
                (user) => user.id === assignedToId
              );
              const ticketId = `TKT-${Date.now().toString().slice(-6)}`;
              const newTicket: Ticket = {
                id: ticketId,
                title: title.trim(),
                description: description.trim(),
                stationName: stationName.trim(),
                category,
                priority,
                status: 'open',
                assignedTo: selectedAssignee?.name ?? null,
                assignedToId: selectedAssignee?.id ?? null,
                createdById: currentUser?.id,
                createdBy: currentUser?.name ?? 'System',
                createdAt: now,
                updatedAt: now,
                tenantId:
                  currentTenant?.id ??
                  selectedAssignee?.tenantId ??
                  currentUser?.tenantId ??
                  'sonelgaz',
                slaDeadline: new Date(
                  now.getTime() + getSlaHoursByPriority(priority) * 60 * 60 * 1000
                ),
              };
              persistTickets([newTicket, ...tickets]);
              toast.success('Task created and assigned');
              setActionDrawer((prev) => ({ ...prev, open: false }));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="ticket-title">Title</Label>
              <Input
                id="ticket-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Charger not responding"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-station">Station</Label>
                <Input
                  id="ticket-station"
                  value={stationName}
                  onChange={(event) => setStationName(event.target.value)}
                  placeholder="Constantine Plaza"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-category">Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as TicketCategory)}>
                  <SelectTrigger id="ticket-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="power_failure">Power Failure</SelectItem>
                    <SelectItem value="screen_issue">Screen Issue</SelectItem>
                    <SelectItem value="charger_fault">Charger Fault</SelectItem>
                    <SelectItem value="system_failure">System Failure</SelectItem>
                    <SelectItem value="network_issue">Network Issue</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-priority">Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as Ticket['priority'])}>
                  <SelectTrigger id="ticket-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-assignee">Assign To</Label>
                <Select value={assignedToId} onValueChange={setAssignedToId}>
                  <SelectTrigger id="ticket-assignee">
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} · {user.role === 'technician' ? 'Technician' : 'Tenant Admin'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-description">Description</Label>
              <Textarea
                id="ticket-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the issue and required checks..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionDrawer((prev) => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button type="submit">Create Task</Button>
            </div>
          </form>
        )}

        {actionDrawer.mode === 'status' && actionDrawer.ticket && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const now = new Date();
              const nextTickets = tickets.map((ticket) =>
                ticket.id === actionDrawer.ticket?.id
                  ? {
                      ...ticket,
                      status: statusUpdate,
                      updatedAt: now,
                    }
                  : ticket
              );
              persistTickets(nextTickets);
              if (selectedTicket?.id === actionDrawer.ticket.id) {
                setSelectedTicket((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: statusUpdate,
                        updatedAt: now,
                      }
                    : prev
                );
              }
              toast.success(`Status updated for ${actionDrawer.ticket?.id}`);
              setActionDrawer((prev) => ({ ...prev, open: false }));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="ticket-status">Status</Label>
              <Select value={statusUpdate} onValueChange={(value) => setStatusUpdate(value as TicketStatus)}>
                <SelectTrigger id="ticket-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-note">Note</Label>
              <Textarea
                id="ticket-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add an operational note..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionDrawer((prev) => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button type="submit">Save Update</Button>
            </div>
          </form>
        )}

        {actionDrawer.mode === 'comment' && actionDrawer.ticket && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const now = new Date();
              const nextTickets = tickets.map((ticket) =>
                ticket.id === actionDrawer.ticket?.id
                  ? {
                      ...ticket,
                      updatedAt: now,
                    }
                  : ticket
              );
              persistTickets(nextTickets);
              toast.success(`Report logged for ${actionDrawer.ticket?.id}`);
              setActionDrawer((prev) => ({ ...prev, open: false }));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="ticket-report">Field Report</Label>
              <Textarea
                id="ticket-report"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Describe anomalies and your findings..."
                rows={5}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionDrawer((prev) => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button type="submit">Submit Report</Button>
            </div>
          </form>
        )}
      </SideDrawer>
    </div>
  );
}
