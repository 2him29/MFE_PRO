import { useStationSocket } from '../useStationSocket';
import { useState, useEffect, FormEvent } from 'react';
import { MapPin, Settings, Power, Wrench, Edit3, Download, Plus } from 'lucide-react';
import { exportToCsv } from '../utils/csvExport';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { ConfirmModal } from '../components/dashboard/ConfirmModal';
import { SideDrawer } from '../components/dashboard/SideDrawer';
import { StationMap } from '../components/dashboard/StationMap';
import { LocationPickerMap } from '../components/dashboard/LocationPickerMap';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Card, CardContent } from '../components/ui/card';
import { TableSkeleton } from '../components/dashboard/LoadingState';
import { loadStations, saveStations } from '../data/stationStore';
import { stationsApi } from '../services/api';
import { Station, ConnectorConfig, ConnectorType, TenantId } from '../types';
import { toast } from 'sonner';

export default function Stations() {
  const { currentTenant, currentUser } = useTenant();
  const [loading, setLoading] = useState(true);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [stations, setStations] = useState<Station[]>(loadStations);

// ── Real-time station status updates from WebSocket ──────────────────────
useStationSocket((update) => {
  setStations(prev => prev.map(s =>
    s.id === update.stationId
      ? { ...s, status: update.status as Station['status'] }
      : s
  ));
});
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newConnectors, setNewConnectors] = useState<ConnectorConfig[]>([
    { type: 'CCS2', count: 1, powerKw: 240 },
  ]);
  const [newLatitude, setNewLatitude] = useState('');
  const [newLongitude, setNewLongitude] = useState('');
  const [newTariff, setNewTariff] = useState('');
  const [newTenantId, setNewTenantId] = useState<TenantId>('sonelgaz');

  const addConnectorRow = () =>
    setNewConnectors((prev) => [...prev, { type: 'CCS2', count: 1, powerKw: 240 }]);

  const removeConnectorRow = (i: number) =>
    setNewConnectors((prev) => prev.filter((_, idx) => idx !== i));

  const updateConnectorRow = (i: number, patch: Partial<ConnectorConfig>) =>
    setNewConnectors((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  useEffect(() => {
    if (!import.meta.env.VITE_API_BASE_URL) {
      const t = setTimeout(() => setLoading(false), 1300);
      return () => clearTimeout(t);
    }
    setLoading(true);
    stationsApi.list(currentTenant?.id)
      .then(setStations)
      .catch(() => {
        setStations(loadStations());
        setUsingCachedData(true);
        toast.error('Failed to load stations from server. Showing cached data.');
      })
      .finally(() => setLoading(false));
  }, [currentTenant?.id]);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: string;
    station: Station | null;
  }>({
    open: false,
    action: '',
    station: null,
  });

  const filteredStations = stations.filter((station) => {
    if (currentTenant && station.tenantId !== currentTenant.id) return false;
    if (statusFilter !== 'all' && station.status !== statusFilter) return false;
    if (cityFilter !== 'all' && station.city !== cityFilter) return false;
    if (
      searchValue &&
      !station.name.toLowerCase().includes(searchValue.toLowerCase()) &&
      !station.city.toLowerCase().includes(searchValue.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const cities = Array.from(new Set(stations.map((s) => s.city)));

  const handleAction = (action: string, station: Station) => {
    setConfirmModal({ open: true, action, station });
  };

  const executeAction = () => {
    const { action, station } = confirmModal;
    toast.success(`${action} action executed for ${station?.name}`);
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newLatitude || !newLongitude) {
      toast.error('Please click the map to place the station location.');
      return;
    }
    const tenantId = currentTenant ? currentTenant.id : newTenantId;
    const dominant = newConnectors.reduce((a, b) => (a.powerKw >= b.powerKw ? a : b));
    const station: Station = {
      id: `STN-${Date.now()}`,
      name: newName,
      city: newCity,
      address: newAddress,
      connectorType: dominant.type,
      power: dominant.powerKw,
      status: 'available',
      tenantId,
      latitude: Number(newLatitude),
      longitude: Number(newLongitude),
      activeConnectors: 0,
      totalConnectors: newConnectors.reduce((sum, c) => sum + c.count, 0),
      currentTariff: Number(newTariff),
      connectors: newConnectors,
    };
    const updated = [...stations, station];
    setStations(updated);
    saveStations(updated);
    toast.success(`Station "${station.name}" created successfully`);
    setCreateOpen(false);
    setNewName('');
    setNewCity('');
    setNewAddress('');
    setNewConnectors([{ type: 'CCS2', count: 1, powerKw: 240 }]);
    setNewLatitude('');
    setNewLongitude('');
    setNewTariff('');
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const handleExport = () => {
    const rows = filteredStations.map((s) => ({
      ID: s.id,
      Name: s.name,
      City: s.city,
      Address: s.address,
      Status: s.status,
      'Connector Type': s.connectorType,
      'Power (kW)': s.power,
      'Active Connectors': s.activeConnectors,
      'Total Connectors': s.totalConnectors,
      'Tariff (DZD)': s.currentTariff,
      Tenant: s.tenantId,
    }));
    exportToCsv('stations', rows, currentUser?.name ?? 'Admin', currentTenant?.id ?? 'all');
    toast.success(`Exported ${rows.length} stations to CSV`);
  };

  return (
    <div className="space-y-6">
      {usingCachedData && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="font-medium">Offline mode</span> — server unreachable, showing locally cached data.
        </div>
      )}
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Stations Management</h1>
          <p className="text-gray-500 mt-1">Monitor and manage charging stations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Station
          </Button>
        </div>
      </div>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <FilterBar
              searchPlaceholder="Search stations by name or city..."
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              filters={[
                {
                  label: 'Status',
                  value: statusFilter,
                  options: [
                    { label: 'Available', value: 'available' },
                    { label: 'Charging', value: 'charging' },
                    { label: 'Fault', value: 'fault' },
                    { label: 'Offline', value: 'offline' },
                    { label: 'Maintenance', value: 'maintenance' },
                  ],
                  onChange: setStatusFilter,
                },
                {
                  label: 'City',
                  value: cityFilter,
                  options: cities.map((city) => ({ label: city, value: city })),
                  onChange: setCityFilter,
                },
              ]}
            />

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
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No stations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStations.map((station) => (
                      <TableRow key={station.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-medium">{station.name}</p>
                            <p className="text-xs text-gray-500">{station.id}</p>
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
                        <TableCell>
                          <StatusChip status={station.status} type="station" />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {station.activeConnectors}/{station.totalConnectors}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {station.connectors.map((c, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center text-xs font-mono px-1.5 py-0.5 rounded border"
                                style={{
                                  borderColor: c.type === 'CCS2' ? '#16a34a' : c.type === 'CHAdeMO' ? '#f59e0b' : '#3b82f6',
                                  color: c.type === 'CCS2' ? '#16a34a' : c.type === 'CHAdeMO' ? '#f59e0b' : '#3b82f6',
                                  backgroundColor: c.type === 'CCS2' ? '#f0fdf4' : c.type === 'CHAdeMO' ? '#fffbeb' : '#eff6ff',
                                }}
                              >
                                {c.type}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {station.connectors.length > 1
                              ? `${Math.min(...station.connectors.map(c => c.powerKw))}–${Math.max(...station.connectors.map(c => c.powerKw))} kW`
                              : `${station.connectors[0]?.powerKw ?? station.power} kW`}
                          </span>
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
                              <DropdownMenuItem
                                onClick={() => handleAction('Enable', station)}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                Enable Station
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAction('Disable', station)}
                                className="text-red-600"
                              >
                                <Power className="h-4 w-4 mr-2" />
                                Disable Station
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleAction('Maintenance Mode', station)}
                              >
                                <Wrench className="h-4 w-4 mr-2" />
                                Maintenance Mode
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAction('Edit Tariff', station)}
                              >
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit Tariff
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
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <StationMap stations={filteredStations} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal({ ...confirmModal, open })}
        title={`${confirmModal.action} Confirmation`}
        description={`Are you sure you want to ${confirmModal.action.toLowerCase()} ${confirmModal.station?.name}? This action will be logged.`}
        confirmLabel="Confirm"
        onConfirm={executeAction}
        variant={confirmModal.action === 'Disable' ? 'destructive' : 'default'}
      />

      <SideDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create New Station"
        description="Add a new charging station to the network."
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          {!currentTenant && isSuperAdmin && (
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select
                value={newTenantId}
                onValueChange={(v) => setNewTenantId(v as TenantId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sonelgaz">Sonelgaz</SelectItem>
                  <SelectItem value="saeig">SAEIG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="stn-name">Station Name</Label>
            <Input
              id="stn-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Alger Centre Station"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stn-city">City</Label>
              <Input
                id="stn-city"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="e.g. Alger"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stn-address">Address</Label>
              <Input
                id="stn-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Street address"
                required
              />
            </div>
          </div>

          {/* Multi-connector configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Connectors</Label>
              <Button type="button" variant="outline" size="sm" onClick={addConnectorRow}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Type
              </Button>
            </div>
            <div className="space-y-2">
              {newConnectors.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_64px_80px_32px] gap-2 items-center">
                  <Select
                    value={row.type}
                    onValueChange={(v) => updateConnectorRow(i, { type: v as ConnectorType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CCS2">CCS2</SelectItem>
                      <SelectItem value="CHAdeMO">CHAdeMO</SelectItem>
                      <SelectItem value="Type 2">Type 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={row.count}
                    onChange={(e) => updateConnectorRow(i, { count: Number(e.target.value) })}
                    placeholder="Qty"
                    title="Quantity"
                    required
                  />
                  <Input
                    type="number"
                    min="1"
                    value={row.powerKw}
                    onChange={(e) => updateConnectorRow(i, { powerKw: Number(e.target.value) })}
                    placeholder="kW"
                    title="Power (kW)"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    disabled={newConnectors.length === 1}
                    onClick={() => removeConnectorRow(i)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Type · Quantity · Power (kW) &nbsp;·&nbsp; Total: {newConnectors.reduce((s, c) => s + c.count, 0)} connectors
            </p>
          </div>

          <LocationPickerMap
            lat={newLatitude}
            lng={newLongitude}
            onChange={(lat, lng) => { setNewLatitude(lat); setNewLongitude(lng); }}
          />

          <div className="space-y-2">
            <Label htmlFor="stn-tariff">Tariff (DZD/kWh)</Label>
            <Input
              id="stn-tariff"
              type="number"
              min="0"
              step="0.5"
              value={newTariff}
              onChange={(e) => setNewTariff(e.target.value)}
              placeholder="e.g. 35"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Station</Button>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
