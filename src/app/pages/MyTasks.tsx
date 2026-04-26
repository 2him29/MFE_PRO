import { useMemo, useState } from 'react';
import { Calendar, ClipboardCheck, MapPin } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { SideDrawer } from '../components/dashboard/SideDrawer';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { mockStations } from '../data/mockData';
import { Ticket, TicketStatus } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { loadTickets, saveTickets } from '../data/ticketStore';

export default function MyTasks() {
  const { currentTenant, currentUser } = useTenant();
  const [tickets, setTickets] = useState<Ticket[]>(() => loadTickets());
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionDrawer, setActionDrawer] = useState<{
    open: boolean;
    mode: 'status' | 'report';
    ticket: Ticket | null;
  }>({ open: false, mode: 'status', ticket: null });
  const [statusUpdate, setStatusUpdate] = useState<TicketStatus>('open');
  const [note, setNote] = useState('');
  const stationByName = useMemo(
    () => new Map(mockStations.map((station) => [station.name, station])),
    []
  );
  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    if (!currentUser) return false;
    if (currentTenant && ticket.tenantId !== currentTenant.id) return false;
    if (currentUser && ticket.tenantId !== currentUser.tenantId) return false;
    if (ticket.assignedToId && currentUser && ticket.assignedToId !== currentUser.id) {
      return false;
    }
    if (!ticket.assignedToId && currentUser) {
      return false;
    }
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (
      searchValue &&
      !ticket.title.toLowerCase().includes(searchValue.toLowerCase()) &&
      !ticket.stationName.toLowerCase().includes(searchValue.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getSLAColor = (deadline: Date) => {
    const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining < 2) return 'text-red-600';
    if (hoursRemaining < 4) return 'text-orange-600';
    return 'text-green-600';
  };

  const getGoogleMapsUrl = (stationName: string) => {
    const station = stationByName.get(stationName);
    if (station) {
      const { latitude, longitude, address, city } = station;
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      }
      if (address || city) {
        const fallbackAddress = [address, city].filter(Boolean).join(', ');
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          fallbackAddress
        )}`;
      }
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      stationName
    )}`;
  };

  const handleOpenStatus = (ticket: Ticket) => {
    setStatusUpdate(ticket.status);
    setNote('');
    setActionDrawer({ open: true, mode: 'status', ticket });
  };

  const handleOpenReport = (ticket: Ticket) => {
    setNote('');
    setActionDrawer({ open: true, mode: 'report', ticket });
  };

  const persistTickets = (nextTickets: Ticket[]) => {
    setTickets(nextTickets);
    saveTickets(nextTickets);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">My Tasks</h1>
          <p className="text-gray-500 mt-1">
            Review assigned incidents and report field anomalies
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.success('Daily report generated')}>
          <ClipboardCheck className="h-4 w-4 mr-2" />
          Export Report
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
          ]}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task ID</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No tasks assigned yet
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/40">
                    <TableCell>
                      <span className="font-mono text-sm">{ticket.id}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.title}</p>
                        <p className="text-xs text-gray-500">{ticket.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{ticket.stationName}</span>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={ticket.status} type="ticket" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className={`text-sm ${getSLAColor(ticket.slaDeadline)}`}>
                          {formatDistanceToNow(ticket.slaDeadline, { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={getGoogleMapsUrl(ticket.stationName)}
                            {...(isMobile
                              ? {}
                              : { target: '_blank', rel: 'noreferrer' })}
                          >
                            <MapPin className="h-4 w-4" />
                            Navigate
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStatus(ticket)}
                        >
                          Update Status
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleOpenReport(ticket)}
                        >
                          Add Report
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <SideDrawer
        open={actionDrawer.open}
        onOpenChange={(open) => setActionDrawer((prev) => ({ ...prev, open }))}
        title={actionDrawer.mode === 'status' ? 'Update Status' : 'Field Report'}
        description={actionDrawer.ticket?.id}
      >
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
              toast.success(`Status updated for ${actionDrawer.ticket?.id}`);
              setActionDrawer((prev) => ({ ...prev, open: false }));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="status-update">Status</Label>
              <Select
                value={statusUpdate}
                onValueChange={(value) => setStatusUpdate(value as TicketStatus)}
              >
                <SelectTrigger id="status-update">
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
              <Label htmlFor="status-note">Note</Label>
              <Textarea
                id="status-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a quick update for the supervisor..."
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

        {actionDrawer.mode === 'report' && actionDrawer.ticket && (
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
              toast.success(`Report submitted for ${actionDrawer.ticket?.id}`);
              setActionDrawer((prev) => ({ ...prev, open: false }));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="report-note">Report</Label>
              <Textarea
                id="report-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Describe anomalies, root cause, and next steps..."
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
