import { useEffect, useState, useCallback } from 'react';
import { Calendar, ClipboardCheck, MapPin, ClipboardList } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useLiveEvents } from '../lib/useLiveEvents';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { PageHeader } from '../components/dashboard/PageHeader';
import { EmptyState } from '../components/dashboard/EmptyState';
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
import { ApiTicket, ticketsApi } from '../lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type DrawerState = {
  open: boolean;
  mode: 'status' | 'report';
  ticket: ApiTicket | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  power_failure:  'Slow charging / power',
  screen_issue:   'Screen issue',
  charger_fault:  'Charger fault',
  system_failure: 'System failure',
  network_issue:  'Network / payment',
  maintenance:    'Damaged equipment',
};

export default function MyTasks() {
  const { currentUser } = useTenant();
  const [tickets, setTickets]         = useState<ApiTicket[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawer, setDrawer]           = useState<DrawerState>({ open: false, mode: 'status', ticket: null });
  const [statusUpdate, setStatusUpdate] = useState<ApiTicket['status']>('open');
  const [note, setNote]               = useState('');

  const refresh = useCallback(async () => {
    try {
      const list = await ticketsApi.list();
      // Technicians only see tickets assigned to them (RF09)
      const visible = currentUser?.role === 'technician'
        ? list.filter((t) => t.assignedToId === currentUser.id)
        : list;
      setTickets(visible);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-fetch whenever an app user files a new report.
  useLiveEvents((event) => {
    if (event.type === 'new_app_ticket') {
      void refresh();
    }
  });

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (
      searchValue &&
      !t.title.toLowerCase().includes(searchValue.toLowerCase()) &&
      !(t.stationName ?? '').toLowerCase().includes(searchValue.toLowerCase())
    ) return false;
    return true;
  });

  const parseDateSafe = (val: string | null | undefined): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const getSLAInfo = (deadline: string | null) => {
    const d = parseDateSafe(deadline);
    if (!d) return { color: 'text-gray-400', label: '—', breached: false };
    const hours = (d.getTime() - Date.now()) / 3_600_000;
    if (hours < 0) return { color: 'text-red-700 font-semibold', label: 'BREACHED', breached: true };
    if (hours < 2) return { color: 'text-red-600', label: formatDistanceToNow(d, { addSuffix: true }), breached: false };
    if (hours < 8) return { color: 'text-orange-500', label: formatDistanceToNow(d, { addSuffix: true }), breached: false };
    return { color: 'text-green-600', label: formatDistanceToNow(d, { addSuffix: true }), breached: false };
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawer.ticket) return;
    try {
      await ticketsApi.updateStatus(drawer.ticket.id, statusUpdate);
      if (note.trim()) {
        await ticketsApi.addActivity(drawer.ticket.id, note.trim());
      }
      toast.success(`Status updated for ${drawer.ticket.id.slice(0, 8)}…`);
      setDrawer((p) => ({ ...p, open: false }));
      void refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update status');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawer.ticket || !note.trim()) return;
    try {
      await ticketsApi.addActivity(drawer.ticket.id, note.trim());
      toast.success(`Report submitted for ${drawer.ticket.id.slice(0, 8)}…`);
      setDrawer((p) => ({ ...p, open: false }));
      void refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to submit report');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description="Open reports from app users and incidents assigned to you. Updates live as new reports come in."
        actions={
          <Button variant="outline" onClick={() => void refresh()}>
            <ClipboardCheck className="h-4 w-4 mr-2" /> Refresh
          </Button>
        }
      />

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
                <TableHead>Ticket</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Loading…</TableCell></TableRow>
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={ClipboardList}
                      title="No open tasks"
                      description="New app reports will appear here automatically."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/40">
                    <TableCell><span className="font-mono text-xs">{ticket.id.slice(0, 8)}…</span></TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.title}</p>
                        <p className="text-xs text-gray-500">
                          {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                          {ticket.description ? ` · ${ticket.description}` : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{ticket.stationName ?? '—'}</span></TableCell>
                    <TableCell><StatusChip status={ticket.priority} type="priority" /></TableCell>
                    <TableCell><StatusChip status={ticket.status} type="ticket" /></TableCell>
                    <TableCell>
                      {(() => {
                        const sla = getSLAInfo(ticket.slaDeadline);
                        const d = parseDateSafe(ticket.slaDeadline);
                        return (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <Calendar className={`h-3.5 w-3.5 ${sla.breached ? 'text-red-600' : 'text-gray-400'}`} />
                              <span className={`text-sm ${sla.color}`}>{sla.label}</span>
                            </div>
                            {d && (
                              <span className="text-xs text-gray-400 pl-5">
                                {format(d, 'MMM dd, HH:mm')}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => {
                            setStatusUpdate(ticket.status);
                            setNote('');
                            setDrawer({ open: true, mode: 'status', ticket });
                          }}
                        >Update Status</Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setNote('');
                            setDrawer({ open: true, mode: 'report', ticket });
                          }}
                        >Add Report</Button>
                        {ticket.stationName && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.stationName)}`}
                              target="_blank" rel="noreferrer"
                            >
                              <MapPin className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
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
        open={drawer.open}
        onOpenChange={(open) => setDrawer((p) => ({ ...p, open }))}
        title={drawer.mode === 'status' ? 'Update Status' : 'Field Report'}
        description={drawer.ticket?.id}
      >
        {drawer.mode === 'status' && drawer.ticket && (
          <form className="space-y-4" onSubmit={handleStatusSubmit}>
            <div className="space-y-2">
              <Label htmlFor="status-update">Status</Label>
              <Select
                value={statusUpdate}
                onValueChange={(v) => setStatusUpdate(v as ApiTicket['status'])}
              >
                <SelectTrigger id="status-update"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-note">Note (optional)</Label>
              <Textarea
                id="status-note" value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a quick update for the supervisor…" rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDrawer((p) => ({ ...p, open: false }))}>Cancel</Button>
              <Button type="submit">Save Update</Button>
            </div>
          </form>
        )}

        {drawer.mode === 'report' && drawer.ticket && (
          <form className="space-y-4" onSubmit={handleReportSubmit}>
            <div className="space-y-2">
              <Label htmlFor="report-note">Report</Label>
              <Textarea
                id="report-note" value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe what you observed, the root cause, and next steps…"
                rows={5} required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDrawer((p) => ({ ...p, open: false }))}>Cancel</Button>
              <Button type="submit">Submit Report</Button>
            </div>
          </form>
        )}
      </SideDrawer>
    </div>
  );
}
