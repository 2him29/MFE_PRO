import { useState } from 'react';
import { Download, Trash2, Archive, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { FilterBar } from '../components/dashboard/FilterBar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  loadArchives,
  deleteArchive,
  type ArchiveEntry,
  type EntityType,
} from '../data/archiveStore';
import { reDownloadArchive } from '../utils/csvExport';
import { toast } from 'sonner';

const entityLabels: Record<EntityType, string> = {
  users: 'Users',
  tickets: 'Tickets',
  stations: 'Stations',
  sessions: 'Sessions',
  billing: 'Billing',
};

const entityColors: Record<EntityType, string> = {
  users: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  tickets: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
  stations: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  sessions: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  billing: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
};

export default function Archives() {
  const [archives, setArchives] = useState<ArchiveEntry[]>(() => loadArchives());
  const [entityFilter, setEntityFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');

  const filtered = archives.filter((a) => {
    if (entityFilter !== 'all' && a.entity !== entityFilter) return false;
    if (
      searchValue &&
      !a.filename.toLowerCase().includes(searchValue.toLowerCase()) &&
      !a.exportedBy.toLowerCase().includes(searchValue.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleDelete = (id: string) => {
    deleteArchive(id);
    setArchives(loadArchives());
    toast.success('Archive deleted');
  };

  const handleReDownload = (entry: ArchiveEntry) => {
    reDownloadArchive(entry.csvData, entry.filename);
    toast.success(`Downloading ${entry.filename}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Archive className="h-8 w-8 text-gray-400" />
            Export Archives
          </h1>
          <p className="text-gray-500 mt-1">
            History of all CSV exports — re-download or delete past snapshots
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{archives.length}</p>
          <p className="text-xs text-gray-500">total archives</p>
        </div>
      </div>

      {archives.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-500">No archives yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Export data from any page and it will appear here for future re-download.
          </p>
        </Card>
      ) : (
        <Card>
          <FilterBar
            searchPlaceholder="Search by filename or exported by..."
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            filters={[
              {
                label: 'Entity',
                value: entityFilter,
                options: [
                  { label: 'Users', value: 'users' },
                  { label: 'Tickets', value: 'tickets' },
                  { label: 'Stations', value: 'stations' },
                  { label: 'Sessions', value: 'sessions' },
                  { label: 'Billing', value: 'billing' },
                ],
                onChange: setEntityFilter,
              },
            ]}
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Exported By</TableHead>
                  <TableHead>Exported At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No archives match your filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                          {entry.filename}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${entityColors[entry.entity]}`}
                        >
                          {entityLabels[entry.entity]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{entry.tenant}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{entry.rowCount} rows</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{entry.exportedBy}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {format(new Date(entry.exportedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReDownload(entry)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      )}
    </div>
  );
}
