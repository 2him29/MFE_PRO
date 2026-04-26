import { useState, useEffect } from 'react';
import { Download, StopCircle, Flag } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { ConfirmModal } from '../components/dashboard/ConfirmModal';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { TableSkeleton } from '../components/dashboard/LoadingState';
import { mockSessions } from '../data/mockData';
import { Session } from '../types';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Sessions() {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1300);
    return () => clearTimeout(t);
  }, []);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: string;
    session: Session | null;
  }>({
    open: false,
    action: '',
    session: null,
  });

  const filteredSessions = mockSessions.filter((session) => {
    if (currentTenant && session.tenantId !== currentTenant.id) return false;
    if (statusFilter !== 'all' && session.status !== statusFilter) return false;
    if (
      searchValue &&
      !session.stationName.toLowerCase().includes(searchValue.toLowerCase()) &&
      !session.userIdentifier.toLowerCase().includes(searchValue.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleAction = (action: string, session: Session) => {
    setConfirmModal({ open: true, action, session });
  };

  const executeAction = () => {
    const { action, session } = confirmModal;
    toast.success(`${action} executed for session ${session?.id}`);
  };

  const handleExport = () => {
    toast.success('Exporting sessions data to CSV...');
  };

  const calculateDuration = (startTime: Date, duration: number) => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Session Monitoring</h1>
          <p className="text-gray-500 mt-1">Track active and completed charging sessions</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <FilterBar
          searchPlaceholder="Search by station, user, or RFID..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'Active', value: 'active' },
                { label: 'Completed', value: 'completed' },
                { label: 'Stopped', value: 'stopped' },
                { label: 'Error', value: 'error' },
              ],
              onChange: setStatusFilter,
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
                <TableHead>User/RFID</TableHead>
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
                <TableSkeleton cols={10} />
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    No sessions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((session) => (
                  <TableRow key={session.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <span className="font-mono text-sm">{session.id}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{session.stationName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{session.connector}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{session.userIdentifier}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(session.startTime, 'MMM dd, HH:mm')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {calculateDuration(session.startTime, session.duration)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{session.energyKwh.toFixed(1)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{session.cost.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={session.status} type="session" />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {session.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => handleAction('Remote Stop', session)}
                              className="text-red-600"
                            >
                              <StopCircle className="h-4 w-4 mr-2" />
                              Remote Stop
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleAction('Flag Anomaly', session)}
                          >
                            <Flag className="h-4 w-4 mr-2" />
                            Flag Anomaly
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

        {/* Summary Footer */}
        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {filteredSessions.length} session(s)
            </span>
            <div className="flex gap-6">
              <div>
                <span className="text-gray-600">Total Energy: </span>
                <span className="font-semibold">
                  {filteredSessions
                    .reduce((acc, s) => acc + s.energyKwh, 0)
                    .toFixed(1)}{' '}
                  kWh
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Revenue: </span>
                <span className="font-semibold">
                  {filteredSessions
                    .reduce((acc, s) => acc + s.cost, 0)
                    .toFixed(2)}{' '}
                  DZD
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal({ ...confirmModal, open })}
        title={`${confirmModal.action} Confirmation`}
        description={`Are you sure you want to ${confirmModal.action.toLowerCase()} session ${confirmModal.session?.id}? This action will be logged and cannot be undone.`}
        confirmLabel="Confirm"
        onConfirm={executeAction}
        variant={confirmModal.action === 'Remote Stop' ? 'destructive' : 'default'}
      />
    </div>
  );
}
