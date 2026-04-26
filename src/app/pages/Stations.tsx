import { useState, useEffect } from 'react';
import { MapPin, Settings, Power, Wrench, Edit3, Download } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { ConfirmModal } from '../components/dashboard/ConfirmModal';
import { StationMap } from '../components/dashboard/StationMap';
import { Button } from '../components/ui/button';
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
import { mockStations } from '../data/mockData';
import { Station } from '../types';
import { toast } from 'sonner';

export default function Stations() {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1300);
    return () => clearTimeout(t);
  }, []);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: string;
    station: Station | null;
  }>({
    open: false,
    action: '',
    station: null,
  });

  const filteredStations = mockStations.filter((station) => {
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

  const cities = Array.from(new Set(mockStations.map((s) => s.city)));

  const handleAction = (action: string, station: Station) => {
    setConfirmModal({ open: true, action, station });
  };

  const executeAction = () => {
    const { action, station } = confirmModal;
    toast.success(`${action} action executed for ${station?.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Stations Management</h1>
          <p className="text-gray-500 mt-1">Monitor and manage charging stations</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
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
    </div>
  );
}