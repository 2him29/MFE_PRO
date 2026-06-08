import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Calendar, Download, Plus } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useLiveEvents } from '../lib/useLiveEvents';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { PageHeader } from '../components/dashboard/PageHeader';
import { EmptyState } from '../components/dashboard/EmptyState';
import { SideDrawer } from '../components/dashboard/SideDrawer';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { TableSkeleton } from '../components/dashboard/LoadingState';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { ApiActivity, ApiStation, ApiTicket, ApiUser, stationsApi, ticketsApi, usersApi } from '../lib/api';
import { getErrorMessage, isAbortError } from '../lib/utils';
import { exportToCsv } from '../lib/csvExport';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const categoryLabels: Record<string, string> = {
  power_failure:  'Slow charging / power',
  screen_issue:   'Screen issue',
  charger_fault:  'Charger fault',
  system_failure: 'System failure',
  network_issue:  'Network / payment',
  maintenance:    'Damaged equipment',
};

type DrawerState = {
  open: boolean;
  mode: 'view' | 'status';
  ticket: ApiTicket | null;
};

type CreateDraft = {
  tenant: string; station: string; title: string; desc: string;
  category: string; priority: ApiTicket['priority']; assignedTo: string; sla: string;
};
const EMPTY_DRAFT: CreateDraft = {
  tenant: '', station: '', title: '', desc: '',
  category: '', priority: 'medium', assignedTo: '', sla: '',
};

const PAGE_SIZE = 20;

export default function Tickets() {
  const { currentUser, currentTenant } = useTenant();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [tickets, setTickets]     = useState<ApiTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [searchValue, setSearchValue]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage]           = useState(1);
  const [drawer, setDrawer]       = useState<DrawerState>({ open: false, mode: 'view', ticket: null });
  const [statusUpdate, setStatusUpdate] = useState<ApiTicket['status']>('open');
  const [note, setNote]           = useState('');
  const [activityLog, setActivityLog]   = useState<ApiActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [createOpen, setCreateOpen]     = useState(false);
  const [creating,   setCreating]       = useState(false);
  const [draft, setDraft]               = useState<CreateDraft>(EMPTY_DRAFT);
  const [formStations, setFormStations] = useState<ApiStation[]>([]);
  const [formUsers,    setFormUsers]    = useState<ApiUser[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const list = await ticketsApi.list({ signal: controller.signal });
      if (controller.signal.aborted) return;
      const now = Date.now();
      const toEscalate = list.filter(
        (t) =>
          t.slaDeadline &&
          new Date(t.slaDeadline).getTime() < now &&
          t.status !== 'resolved' &&
          t.status !== 'escalated' &&
          t.status !== 'closed'
      );
      if (toEscalate.length > 0) {
        await Promise.allSettled(
          toEscalate.map((t) => ticketsApi.updateStatus(t.id, 'escalated'))
        );
        toast.warning(`${toEscalate.length} ticket(s) auto-escalated — SLA deadline breached.`);
        if (!controller.signal.aborted) setTickets(await ticketsApi.list({ signal: controller.signal }));
      } else {
        setTickets(list);
      }
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      toast.error(getErrorMessage(err, 'Failed to load tickets'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => { abortRef.current?.abort(); };
  }, [refresh]);

  // Fetch activity log whenever the ticket drawer opens on a ticket
  useEffect(() => {
    if (!drawer.open || !drawer.ticket) { setActivityLog([]); return; }
    setActivityLoading(true);
    ticketsApi.getActivity(drawer.ticket.id)
      .then(setActivityLog)
      .catch(() => setActivityLog([]))
      .finally(() => setActivityLoading(false));
  }, [drawer.ticket?.id, drawer.open]);

  // Live refresh when app users submit a new report.
  useLiveEvents((event) => {
    if (event.type === 'new_app_ticket') void refresh();
  });

  useEffect(() => {
    if (!createOpen) return;
    const tid = isSuperAdmin ? draft.tenant || undefined : currentTenant?.id;
    Promise.all([stationsApi.list(tid), usersApi.list(tid)])
      .then(([stations, users]) => {
        setFormStations(stations);
        setFormUsers(users.filter(u => u.status === 'active'));
      })
      .catch(() => {});
  }, [createOpen, draft.tenant, isSuperAdmin, currentTenant?.id]);

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter   !== 'all' && t.status   !== statusFilter)   return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (
      searchValue &&
      !t.title.toLowerCase().includes(searchValue.toLowerCase()) &&
      !(t.stationName ?? '').toLowerCase().includes(searchValue.toLowerCase())
    ) return false;
    return true;
  });

  const totalPages    = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const pagedTickets  = filteredTickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange   = (v: string) => { setSearchValue(v);   setPage(1); };
  const handleStatusFilter   = (v: string) => { setStatusFilter(v);  setPage(1); };
  const handlePriorityFilter = (v: string) => { setPriorityFilter(v); setPage(1); };

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
    if (hours < 2)  return { color: 'text-red-600', label: formatDistanceToNow(d, { addSuffix: true }), breached: false };
    if (hours < 8)  return { color: 'text-orange-500', label: formatDistanceToNow(d, { addSuffix: true }), breached: false };
    return { color: 'text-green-600', label: formatDistanceToNow(d, { addSuffix: true }), breached: false };
  };

  const handleStatusChange = (v: ApiTicket['status']) => {
    setStatusUpdate(v);
    if (v === 'in_progress' && drawer.ticket?.assignedToId) {
      const busyCount = tickets.filter(
        (t) => t.assignedToId === drawer.ticket!.assignedToId &&
                t.status === 'in_progress' &&
                t.id !== drawer.ticket!.id
      ).length;
      if (busyCount > 0) {
        toast.warning(
          `${drawer.ticket.assignedTo ?? 'This technician'} is already handling ${busyCount} in-progress ticket(s). Save will proceed.`
        );
      }
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawer.ticket) return;
    try {
      await ticketsApi.updateStatus(drawer.ticket.id, statusUpdate);
      if (note.trim()) await ticketsApi.addActivity(drawer.ticket.id, note.trim());
      toast.success(`Updated ticket ${drawer.ticket.id.slice(0, 8)}…`);
      setDrawer({ open: false, mode: 'view', ticket: null });
      void refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to update ticket'));
    }
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const tenantId = isSuperAdmin ? draft.tenant : currentTenant?.id;
    if (isSuperAdmin && !tenantId) { toast.error('Select a tenant'); return; }
    if (!draft.station)            { toast.error('Select a station'); return; }
    if (!draft.title.trim())       { toast.error('Title is required'); return; }
    if (!draft.category)           { toast.error('Select a category'); return; }
    setCreating(true);
    try {
      await ticketsApi.create({
        station_id:          draft.station,
        title:               draft.title.trim(),
        ...(draft.desc.trim()    ? { description:         draft.desc.trim() }  : {}),
        category:            draft.category,
        priority:            draft.priority,
        ...(draft.assignedTo     ? { assigned_to_user_id: draft.assignedTo }   : {}),
        ...(draft.sla            ? { sla_deadline:        draft.sla }          : {}),
        ...(isSuperAdmin && tenantId ? { tenant_id: tenantId }                  : {}),
      });
      toast.success('Ticket created');
      setCreateOpen(false);
      setDraft(EMPTY_DRAFT);
      void refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create ticket'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description={`All incident reports and maintenance tasks across ${currentUser?.role === 'super_admin' ? 'every tenant' : 'your tenant'}. Updates live as app users send reports.`}
        actions={
          <>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Ticket
            </Button>
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" onClick={() => {
              const visible = tickets.filter((t) => {
                if (statusFilter !== 'all' && t.status !== statusFilter) return false;
                if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
                if (searchValue && !t.title.toLowerCase().includes(searchValue.toLowerCase()) &&
                    !(t.stationName ?? '').toLowerCase().includes(searchValue.toLowerCase())) return false;
                return true;
              });
              if (visible.length === 0) { toast.error('No tickets to export'); return; }
              const rows = visible.map((t) => ({
                id: t.id, title: t.title, category: t.category,
                priority: t.priority, status: t.status,
                station: t.stationName ?? '', assigned_to: t.assignedTo ?? '',
                created: t.createdAt, tenant: t.tenantId,
              }));
              exportToCsv(rows, `tickets_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`, 'tickets', currentUser?.name ?? 'admin');
              toast.success(`Exported ${rows.length} tickets`);
            }}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </>
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search by title or station..."
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'Open',         value: 'open' },
                { label: 'In Progress',  value: 'in_progress' },
                { label: 'Resolved',     value: 'resolved' },
                { label: 'Escalated',    value: 'escalated' },
              ],
              onChange: handleStatusFilter,
            },
            {
              label: 'Priority',
              value: priorityFilter,
              options: [
                { label: 'Low',      value: 'low' },
                { label: 'Medium',   value: 'medium' },
                { label: 'High',     value: 'high' },
                { label: 'Critical', value: 'critical' },
              ],
              onChange: handlePriorityFilter,
            },
          ]}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton cols={9} />
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <EmptyState
                      icon={AlertCircle}
                      title="No tickets found"
                      description="Try adjusting your filters. New app reports will appear here automatically."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pagedTickets.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell><span className="font-mono text-xs">{t.id.slice(0, 8)}…</span></TableCell>
                    <TableCell>
                      <p className="font-medium">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-gray-500 truncate max-w-xs">{t.description}</p>
                      )}
                    </TableCell>
                    <TableCell><span className="text-sm">{t.stationName ?? '—'}</span></TableCell>
                    <TableCell>
                      <span className="text-sm">{categoryLabels[t.category] ?? t.category}</span>
                    </TableCell>
                    <TableCell><StatusChip status={t.priority} type="priority" /></TableCell>
                    <TableCell><StatusChip status={t.status} type="ticket" /></TableCell>
                    <TableCell>
                      {(() => {
                        const sla = getSLAInfo(t.slaDeadline);
                        const d = parseDateSafe(t.slaDeadline);
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
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {(() => {
                          const d = parseDateSafe(t.createdAt);
                          return d ? format(d, 'MMM dd, HH:mm') : '—';
                        })()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => {
                          setStatusUpdate(t.status);
                          setNote('');
                          setDrawer({ open: true, mode: 'status', ticket: t });
                        }}
                      >Update</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {pagedTickets.length} of {filteredTickets.length} ticket(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >Previous</Button>
              <span className="text-xs text-gray-500">Page {page} / {totalPages}</span>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >Next</Button>
            </div>
          </div>
        )}
      </Card>

      <SideDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((p) => ({ ...p, open }))}
        title={drawer.ticket?.title ?? 'Ticket'}
        description={drawer.ticket?.stationName ?? undefined}
      >
        {drawer.ticket && (
          <form className="space-y-4" onSubmit={handleStatusSubmit}>
            {drawer.ticket.description && (
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-900/40 p-3 text-sm">
                {drawer.ticket.description}
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusUpdate} onValueChange={(v) => handleStatusChange(v as ApiTicket['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you find / do? Saved to the activity log."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDrawer({ open: false, mode: 'view', ticket: null })}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}

        {/* Activity Log */}
        {drawer.ticket && (
          <div className="mt-6 border-t pt-4">
            <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Activity Log</p>
            {activityLoading ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : activityLog.length === 0 ? (
              <p className="text-xs text-gray-400">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {activityLog.map((entry) => {
                  const d = parseDateSafe(entry.createdAt);
                  return (
                    <div key={entry.id} className="rounded-md border bg-gray-50 dark:bg-gray-900/40 p-2.5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {entry.actorName ?? 'System'}
                        </span>
                        <span className="text-gray-400">
                          {d ? format(d, 'MMM dd, HH:mm') : '—'}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {entry.details ?? entry.action}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </SideDrawer>

      {/* Create ticket drawer */}
      <SideDrawer
        open={createOpen}
        onOpenChange={(open) => { setCreateOpen(open); if (!open) setDraft(EMPTY_DRAFT); }}
        title="New Ticket"
        description="Create an incident or maintenance task"
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label>Tenant *</Label>
              <Select value={draft.tenant} onValueChange={v => setDraft(d => ({ ...d, tenant: v, station: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select tenant…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sonelgaz">Sonelgaz</SelectItem>
                  <SelectItem value="saeig">SAEIG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Station *</Label>
            <Select value={draft.station} onValueChange={v => setDraft(d => ({ ...d, station: v }))}>
              <SelectTrigger>
                <SelectValue placeholder={isSuperAdmin && !draft.tenant ? 'Select a tenant first…' : 'Select station…'} />
              </SelectTrigger>
              <SelectContent>
                {formStations.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — {s.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Brief summary…"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={draft.desc}
              onChange={e => setDraft(d => ({ ...d, desc: e.target.value }))}
              placeholder="Additional details…"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={draft.category} onValueChange={v => setDraft(d => ({ ...d, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>{lbl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={draft.priority} onValueChange={v => setDraft(d => ({ ...d, priority: v as ApiTicket['priority'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assign to</Label>
            <Select
              value={draft.assignedTo || '__none'}
              onValueChange={v => setDraft(d => ({ ...d, assignedTo: v === '__none' ? '' : v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Unassigned —</SelectItem>
                {formUsers.filter(u => u.role === 'technician').map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SLA Deadline</Label>
            <Input
              type="datetime-local"
              value={draft.sla}
              onChange={e => setDraft(d => ({ ...d, sla: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setDraft(EMPTY_DRAFT); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Creating…</>
                : 'Create Ticket'
              }
            </Button>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
