import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Settings, Power, Wrench, Edit3, Download, RefreshCw, Plus, Archive, RotateCcw, Zap } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useLiveEvents } from '../lib/useLiveEvents';
import { mockStations } from '../data/mockData';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { PageHeader } from '../components/dashboard/PageHeader';
import { EmptyState } from '../components/dashboard/EmptyState';
import { ConfirmModal } from '../components/dashboard/ConfirmModal';
import { StationMap } from '../components/dashboard/StationMap';
import { LocationPicker } from '../components/dashboard/LocationPicker';
import { SideDrawer } from '../components/dashboard/SideDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { TableSkeleton } from '../components/dashboard/LoadingState';
import { ApiStation, stationsApi } from '../lib/api';
import { getErrorMessage, isAbortError } from '../lib/utils';
import { archiveStore } from '../lib/archiveStore';
import { toast } from 'sonner';

// ── CSV export helper ─────────────────────────────────────────────────────────
function downloadCsv(filename: string, headers: string[], rows: (string | number)[]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function Stations() {
  const { currentTenant, currentUser } = useTenant();

  // ── Active stations ─────────────────────────────────────────────────────────
  const [stations, setStations]         = useState<ApiStation[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchValue, setSearchValue]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter]     = useState('all');

  // ── Archived stations ───────────────────────────────────────────────────────
  const [archived, setArchived]         = useState<ApiStation[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveTab, setArchiveTab]     = useState(false);

  // ── Confirm modal ───────────────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; action: string; station: ApiStation | null;
  }>({ open: false, action: '', station: null });

  // ── Add-station drawer ──────────────────────────────────────────────────────
  const [addOpen, setAddOpen]     = useState(false);
  const [adding, setAdding]       = useState(false);
  const [addName, setAddName]     = useState('');
  const [addCity, setAddCity]     = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addLat, setAddLat]       = useState('');
  const [addLng, setAddLng]       = useState('');
  const [addTariff, setAddTariff]               = useState('');
  const [addConnectorType, setAddConnectorType] = useState('CCS2');
  const [addPower, setAddPower]                 = useState('');

  const isSuperAdmin   = currentUser?.role === 'super_admin';
  const canManage      = isSuperAdmin || currentUser?.role === 'tenant_admin';
  const tenantScope    = isSuperAdmin ? undefined : currentUser?.tenantId;
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch active stations ───────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const list = await stationsApi.list(tenantScope, controller.signal);
      if (!controller.signal.aborted) {
        setStations(list.length > 0 ? list : (mockStations as unknown as ApiStation[]));
      }
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      toast.error(getErrorMessage(err, 'Failed to load stations'));
      if (!controller.signal.aborted) setStations(mockStations as unknown as ApiStation[]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [tenantScope]);

  useEffect(() => {
    void refresh();
    return () => { abortRef.current?.abort(); };
  }, [refresh]);

  // ── Fetch archived stations ─────────────────────────────────────────────────
  const loadArchived = useCallback(async () => {
    if (!isSuperAdmin) return;
    setArchiveLoading(true);
    try {
      setArchived(await stationsApi.listArchived());
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load archives'));
    } finally {
      setArchiveLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (archiveTab) void loadArchived();
  }, [archiveTab, loadArchived]);

  // ── Live status updates ─────────────────────────────────────────────────────
  useLiveEvents((event) => {
    if (event.type === 'station_status_update') {
      setStations((prev) =>
        prev.map((s) =>
          s.id === event.stationId ? { ...s, status: event.status as ApiStation['status'] } : s
        )
      );
    }
  });

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredStations = stations.filter((s) => {
    if (currentUser?.role !== 'super_admin' && currentTenant && s.tenantId !== currentTenant.id) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (cityFilter   !== 'all' && s.city   !== cityFilter)   return false;
    if (searchValue && !s.name.toLowerCase().includes(searchValue.toLowerCase()) &&
                       !s.city.toLowerCase().includes(searchValue.toLowerCase())) return false;
    return true;
  });

  const cities = useMemo(() => Array.from(new Set(stations.map((s) => s.city))), [stations]);

  // ── Action → status map ─────────────────────────────────────────────────────
  const actionToStatus = (action: string): ApiStation['status'] | null => {
    switch (action) {
      case 'Enable':           return 'available';
      case 'Disable':          return 'offline';
      case 'Maintenance Mode': return 'maintenance';
      default:                 return null;
    }
  };

  // ── Execute status / tariff action ──────────────────────────────────────────
  const executeAction = async () => {
    const { action, station } = confirmModal;
    if (!station) return;

    if (action === 'Archive') {
      try {
        await stationsApi.archive(station.id);
        toast.success(`${station.name} archived`);
        setStations((prev) => prev.filter((s) => s.id !== station.id));
        if (archiveTab) void loadArchived();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Failed to archive station'));
      }
      return;
    }

    if (action === 'Restore') {
      try {
        await stationsApi.restore(station.id);
        toast.success(`${station.name} restored`);
        setArchived((prev) => prev.filter((s) => s.id !== station.id));
        void refresh();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Failed to restore station'));
      }
      return;
    }

    const newStatus = actionToStatus(action);
    if (!newStatus) { toast.success(`${action} acknowledged for ${station.name}`); return; }
    try {
      await stationsApi.updateStatus(station.id, newStatus);
      toast.success(`${station.name} → ${newStatus}`);
      setStations((prev) => prev.map((s) => (s.id === station.id ? { ...s, status: newStatus } : s)));
      await refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, `Failed to update ${station.name}`));
    }
  };

  // ── Create station ──────────────────────────────────────────────────────────
  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(addLat);
    const lng = parseFloat(addLng);
    if (isNaN(lat) || isNaN(lng)) { toast.error('Please pick a location on the map'); return; }
    setAdding(true);
    try {
      await stationsApi.create({
        name:           addName.trim(),
        city:           addCity.trim(),
        address:        addAddress.trim(),
        latitude:       lat,
        longitude:      lng,
        connector_type: addConnectorType,
        ...(addPower  ? { power_kw:                   parseFloat(addPower)  } : {}),
        ...(addTariff ? { current_tariff_dzd_per_kwh: parseFloat(addTariff) } : {}),
      });
      toast.success(`Station "${addName}" created`);
      setAddOpen(false);
      setAddName(''); setAddCity(''); setAddAddress('');
      setAddLat(''); setAddLng(''); setAddTariff('');
      setAddConnectorType('CCS2'); setAddPower('');
      void refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to create station'));
    } finally {
      setAdding(false);
    }
  };

  // ── CSV export ──────────────────────────────────────────────────────────────
  const exportCsv = () => {
    const headers = ['ID', 'Name', 'City', 'Address', 'Status', 'Connectors', 'Type', 'Power (kW)', 'Tariff (DZD/kWh)', 'Tenant'];
    const rows = filteredStations.map((s) =>
      [s.id, s.name, s.city, s.address, s.status,
       `${s.activeConnectors}/${s.totalConnectors}`,
       s.connectorType, s.power, s.currentTariff, s.tenantId].map(
        (v) => `"${String(v).replace(/"/g, '""')}"`
      ).join(',')
    );
    const filename = `stations_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, headers, rows);
    archiveStore.add({ exportType: 'stations', filename, rowCount: filteredStations.length, exportedBy: currentUser?.name ?? 'admin' });
    toast.success('Stations exported to CSV');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stations Management"
        description="Monitor and manage charging stations"
        actions={
          <>
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            {canManage && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Station
              </Button>
            )}
          </>
        }
      />

      {/* ── Filter / search bar — visible on all tabs ── */}
      <Card>
        <FilterBar
          searchPlaceholder="Search stations by name or city..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={[
            {
              label: 'Status', value: statusFilter,
              options: [
                { label: 'Available',   value: 'available' },
                { label: 'Charging',    value: 'charging' },
                { label: 'Fault',       value: 'fault' },
                { label: 'Offline',     value: 'offline' },
                { label: 'Maintenance', value: 'maintenance' },
              ],
              onChange: setStatusFilter,
            },
            {
              label: 'City', value: cityFilter,
              options: cities.map((c) => ({ label: c, value: c })),
              onChange: setCityFilter,
            },
          ]}
        />
      </Card>

      {/* ── Tabs: Table / Map / Archives ── */}
      <Tabs defaultValue="table" className="space-y-4"
        onValueChange={(v) => setArchiveTab(v === 'archives')}
      >
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="archives">Archives</TabsTrigger>}
        </TabsList>

        {/* ── Active stations table ── */}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Connectors</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Power</TableHead>
                    <TableHead>Tariff</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSkeleton cols={8} />
                  ) : filteredStations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <EmptyState
                          icon={Zap}
                          title="No stations found"
                          description="Try adjusting your search or status filter."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStations.map((station) => (
                      <TableRow key={station.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-medium">{station.name}</p>
                            <p className="text-xs text-gray-500">{station.id.slice(0, 8)}…</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm">{station.city}</p>
                              <p className="text-xs text-gray-500">{station.address}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><StatusChip status={station.status} type="station" /></TableCell>
                        <TableCell>
                          <span className="text-sm">{station.activeConnectors}/{station.totalConnectors}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">{station.connectorType}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{station.power} kW</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{station.currentTariff} DZD/kWh</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setConfirmModal({ open: true, action: 'Enable', station })}>
                                <Power className="h-4 w-4 mr-2" /> Enable Station
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (station.status === 'charging') {
                                    toast.warning(`${station.name} is currently charging — disabling will interrupt the active session.`);
                                  }
                                  setConfirmModal({ open: true, action: 'Disable', station });
                                }}
                                className="text-red-600"
                              >
                                <Power className="h-4 w-4 mr-2" /> Disable Station
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setConfirmModal({ open: true, action: 'Maintenance Mode', station })}>
                                <Wrench className="h-4 w-4 mr-2" /> Maintenance Mode
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setConfirmModal({ open: true, action: 'Edit Tariff', station })}>
                                <Edit3 className="h-4 w-4 mr-2" /> Edit Tariff
                              </DropdownMenuItem>
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setConfirmModal({ open: true, action: 'Archive', station })}
                                    className="text-amber-600"
                                  >
                                    <Archive className="h-4 w-4 mr-2" /> Archive Station
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Map view ── */}
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <StationMap stations={filteredStations} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Archives tab (super_admin only) ── */}
        {isSuperAdmin && (
          <TabsContent value="archives" className="space-y-4">
            <Card>
              <div className="p-4 border-b flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Archived (soft-deleted) stations. Restore to make them active again.
                </p>
                <Button variant="outline" size="sm" onClick={loadArchived}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tariff</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archiveLoading ? (
                      <TableSkeleton cols={6} />
                    ) : archived.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <EmptyState
                            icon={Archive}
                            title="No archived stations"
                            description="Stations you archive will appear here."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      archived.map((station) => (
                        <TableRow key={station.id} className="opacity-75 hover:opacity-100 transition-opacity">
                          <TableCell>
                            <div>
                              <p className="font-medium">{station.name}</p>
                              <p className="text-xs text-gray-500">{station.id.slice(0, 8)}…</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-sm">{station.city}</p>
                                <p className="text-xs text-gray-500">{station.address}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><StatusChip status={station.status} type="station" /></TableCell>
                          <TableCell><span className="text-sm font-mono">{station.connectorType}</span></TableCell>
                          <TableCell><span className="text-sm">{station.currentTariff} DZD/kWh</span></TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmModal({ open: true, action: 'Restore', station })}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" /> Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Confirm modal ── */}
      <ConfirmModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal({ ...confirmModal, open })}
        title={`${confirmModal.action} Confirmation`}
        description={`Are you sure you want to ${confirmModal.action.toLowerCase()} ${confirmModal.station?.name}? This action will be logged.`}
        confirmLabel="Confirm"
        onConfirm={executeAction}
        variant={confirmModal.action === 'Disable' || confirmModal.action === 'Archive' ? 'destructive' : 'default'}
      />

      {/* ── Add Station drawer ── */}
      <SideDrawer
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add New Station"
        description="Create a new charging station"
      >
        <form className="space-y-4" onSubmit={handleAddStation}>
          <div className="space-y-2">
            <Label>Station Name</Label>
            <Input value={addName} onChange={(e) => setAddName(e.target.value)}
              placeholder="Alger Centre Station" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={addCity} onChange={(e) => setAddCity(e.target.value)}
                placeholder="Alger" required />
            </div>
            <div className="space-y-2">
              <Label>Tariff (DZD/kWh)</Label>
              <Input type="number" min="0" step="0.01" value={addTariff}
                onChange={(e) => setAddTariff(e.target.value)} placeholder="45.00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={addAddress} onChange={(e) => setAddAddress(e.target.value)}
              placeholder="1 Rue Didouche Mourad" required />
          </div>
          <LocationPicker
            lat={addLat}
            lng={addLng}
            onChange={(lat, lng) => { setAddLat(lat); setAddLng(lng); }}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Connector Type</Label>
              <Select value={addConnectorType} onValueChange={setAddConnectorType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CCS2">CCS2 (DC fast)</SelectItem>
                  <SelectItem value="CHAdeMO">CHAdeMO (DC fast)</SelectItem>
                  <SelectItem value="Type 2">Type 2 (AC)</SelectItem>
                  <SelectItem value="All">All (CCS2 + CHAdeMO + Type 2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Power (kW)</Label>
              <Input type="number" min="1" step="any" value={addPower}
                onChange={(e) => setAddPower(e.target.value)}
                placeholder={
                  addConnectorType === 'Type 2' ? '22' :
                  addConnectorType === 'CHAdeMO' ? '100' : '240'
                } />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={adding}>{adding ? 'Creating…' : 'Create Station'}</Button>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
