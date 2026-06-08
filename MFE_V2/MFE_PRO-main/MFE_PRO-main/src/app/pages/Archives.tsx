import { useState, useEffect } from 'react';
import { Archive, Download, Trash2 } from 'lucide-react';
import { archiveStore, type ArchiveEntry } from '../lib/archiveStore';
import { PageHeader } from '../components/dashboard/PageHeader';
import { EmptyState } from '../components/dashboard/EmptyState';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Card, CardContent, CardHeader,
} from '../components/ui/card';
import { format } from 'date-fns';

const TYPE_LABELS: Record<string, string> = {
  stations: 'Stations',
  sessions: 'Sessions',
  billing:  'Billing',
  users:    'Users',
  tickets:  'Tickets',
};

const TYPE_COLORS: Record<string, string> = {
  stations: 'bg-blue-100 text-blue-800',
  sessions: 'bg-green-100 text-green-800',
  billing:  'bg-yellow-100 text-yellow-800',
  users:    'bg-purple-100 text-purple-800',
  tickets:  'bg-red-100 text-red-800',
};

const FILTER_TYPES = ['all', 'stations', 'sessions', 'billing', 'users', 'tickets'];

export default function Archives() {
  const [entries, setEntries]     = useState<ArchiveEntry[]>([]);
  const [search, setSearch]       = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    setEntries(archiveStore.list());
  }, []);

  const filtered = entries.filter((e) => {
    const matchType   = filterType === 'all' || e.exportType === filterType;
    const matchSearch =
      search === '' ||
      e.filename.toLowerCase().includes(search.toLowerCase()) ||
      e.exportedBy.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const handleClear = () => {
    archiveStore.clear();
    setEntries([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Archives"
        description="History of all CSV exports generated from the platform"
        actions={
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClear}
            disabled={entries.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Input
              placeholder="Search by filename or user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex gap-2 flex-wrap">
              {FILTER_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterType === t
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'all' ? 'All' : TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No export records found"
              description="CSV exports from Stations, Billing, Sessions, etc. will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-3 pr-4 font-medium">Filename</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Rows</th>
                    <th className="pb-3 pr-4 font-medium">Exported By</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{entry.filename}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            TYPE_COLORS[entry.exportType] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {TYPE_LABELS[entry.exportType] || entry.exportType}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {entry.rowCount.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{entry.exportedBy}</td>
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {format(new Date(entry.exportedAt), 'dd MMM yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-center">
        {entries.length} total export{entries.length !== 1 ? 's' : ''} recorded in this browser
      </p>
    </div>
  );
}
