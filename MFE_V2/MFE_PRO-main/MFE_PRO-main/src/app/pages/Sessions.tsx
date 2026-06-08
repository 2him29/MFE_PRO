import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Download, StopCircle, Flag, RefreshCw } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useLiveEvents } from '../lib/useLiveEvents';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { PageHeader } from '../components/dashboard/PageHeader';
import { EmptyState } from '../components/dashboard/EmptyState';
import { ConfirmModal } from '../components/dashboard/ConfirmModal';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { TableSkeleton } from '../components/dashboard/LoadingState';
import { ApiSession, sessionsApi } from '../lib/api';
import { getErrorMessage, isAbortError } from '../lib/utils';
import { exportToCsv } from '../lib/csvExport';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

export default function Sessions() {
  const { currentUser } = useTenant();
  const [sessions, setSessions]       = useState<ApiSession[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]               = useState(1);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: string;
    session: ApiSession | null;
  }>({ open: false, action: '', session: null });

  const tenantScope = currentUser?.role === 'super_admin' ? undefined : currentUser?.tenantId;
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setSessions(await sessionsApi.list({ tenantId: tenantScope, signal: controller.signal }));
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      toast.error(getErrorMessage(err, 'Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  }, [tenantScope]);

  useEffect(() => {
    void refresh();
    return () => { abortRef.current?.abort(); };
  }, [refresh]);

  // Whenever an app user starts charging, refresh.
  useLiveEvents((event) => {
    if (event.type === 'new_app_session') {
      void refresh();
    }
  });

  const filteredSessions = sessions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (
      searchValue &&
      !(s.stationName ?? '').toLowerCase().includes(searchValue.toLowerCase()) &&
      !(s.userIdentifier ?? '').toLowerCase().includes(searchValue.toLowerCase())
    ) return false;
    return true;
  });

  const totalPages   = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const pagedSessions = filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (v: string) => { setSearchValue(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };

  const executeAction = async () => {
    const { action, session } = confirmModal;
    if (!session) return;
    try {
      if (action === 'Remote Stop') {
        await sessionsApi.action(session.id, 'remote_stop');
        toast.success(`Session ${session.id.slice(0, 8)}… stopped — user notified.`);
      } else if (action === 'Flag Anomaly') {
        await sessionsApi.action(session.id, 'flag_anomaly');
        toast.success(`Session ${session.id.slice(0, 8)}… flagged — user notified.`);
      }
      void refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, `Failed to ${action.toLowerCase()}`));
    }
  };

  const calculateDuration = (durationMin: number) => {
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Monitoring"
        description="Live and completed charging sessions. New app sessions land here automatically."
        actions={
          <>
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => {
              if (filteredSessions.length === 0) { toast.error('No sessions to export'); return; }
              const rows = filteredSessions.map((s) => ({
                id: s.id, station: s.stationName, connector: s.connector,
                user_name: s.appUserName ?? '—', user_email: s.appUserEmail ?? s.userIdentifier,
                payment: s.paymentMethod ?? '—', start: s.startTime,
                duration_min: s.duration, energy_kwh: s.energyKwh,
                cost_dzd: s.cost, status: s.status, tenant: s.tenantId,
              }));
              exportToCsv(rows, `sessions_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`, 'sessions', currentUser?.name ?? 'admin');
              toast.success(`Exported ${rows.length} sessions`);
            }}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </>
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search by station, user, or RFID..."
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'Active',    value: 'active' },
                { label: 'Completed', value: 'completed' },
                { label: 'Stopped',   value: 'stopped' },
                { label: 'Error',     value: 'error' },
              ],
              onChange: handleStatusFilter,
            },
          ]}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Connector</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Energy (kWh)</TableHead>
                <TableHead>Cost (DZD)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton cols={11} />
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="p-0">
                    <EmptyState
                      icon={Activity}
                      title="No sessions found"
                      description="Try adjusting your search or status filter."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pagedSessions.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell><span className="font-mono text-xs">{s.id.slice(0, 8)}…</span></TableCell>
                    <TableCell><span className="font-medium">{s.stationName}</span></TableCell>
                    <TableCell><span className="font-mono text-sm">{s.connector}</span></TableCell>
                    <TableCell>
                      {s.appUserName ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm">{s.appUserName}</span>
                          <span className="text-xs text-muted-foreground">{s.appUserEmail ?? s.userIdentifier}</span>
                        </div>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">{s.userIdentifier}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.paymentMethod ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {s.paymentMethod === 'cib'       ? 'CIB Card'
                           : s.paymentMethod === 'epayment'  ? 'BaridiMob'
                           : s.paymentMethod === 'rfid_card' ? 'RFID Card'
                           : s.paymentMethod}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {s.startTime ? format(new Date(s.startTime), 'MMM dd, HH:mm') : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{calculateDuration(s.duration ?? 0)}</span>
                    </TableCell>
                    <TableCell><span className="font-medium">{(s.energyKwh ?? 0).toFixed(1)}</span></TableCell>
                    <TableCell><span className="font-medium">{(s.cost ?? 0).toFixed(2)}</span></TableCell>
                    <TableCell><StatusChip status={s.status} type="session" /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {s.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => {
                                toast.warning(`Session ${s.id.slice(0, 8)}… is actively charging — stopping it will end the session immediately.`);
                                setConfirmModal({ open: true, action: 'Remote Stop', session: s });
                              }}
                              className="text-red-600"
                            >
                              <StopCircle className="h-4 w-4 mr-2" /> Remote Stop
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setConfirmModal({ open: true, action: 'Flag Anomaly', session: s })}
                          >
                            <Flag className="h-4 w-4 mr-2" /> Flag Anomaly
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
            <span className="text-gray-600">
              Showing {pagedSessions.length} of {filteredSessions.length} session(s)
            </span>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-gray-600">Total Energy: </span>
                <span className="font-semibold">
                  {filteredSessions.reduce((acc, s) => acc + (s.energyKwh ?? 0), 0).toFixed(1)} kWh
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Revenue: </span>
                <span className="font-semibold">
                  {filteredSessions.reduce((acc, s) => acc + (s.cost ?? 0), 0).toFixed(2)} DZD
                </span>
              </div>
              {totalPages > 1 && (
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
              )}
            </div>
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal({ ...confirmModal, open })}
        title={`${confirmModal.action} Confirmation`}
        description={`Are you sure you want to ${confirmModal.action.toLowerCase()} session ${confirmModal.session?.id.slice(0, 8)}…?`}
        confirmLabel="Confirm"
        onConfirm={executeAction}
        variant={confirmModal.action === 'Remote Stop' ? 'destructive' : 'default'}
      />
    </div>
  );
}
