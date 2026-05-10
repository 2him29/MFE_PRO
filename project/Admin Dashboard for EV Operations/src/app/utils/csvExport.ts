import { addArchive, type EntityType } from '../data/archiveStore';

function objectsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
}

function triggerDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCsv(
  entity: EntityType,
  rows: Record<string, unknown>[],
  exportedBy: string,
  tenant: string
): void {
  const csv = objectsToCsv(rows);
  const ts = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  const filename = `${entity}_${tenant}_${ts}.csv`;
  triggerDownload(csv, filename);
  addArchive({
    entity,
    filename,
    exportedAt: new Date().toISOString(),
    exportedBy,
    rowCount: rows.length,
    tenant,
    csvData: csv,
  });
}

export function reDownloadArchive(csvData: string, filename: string): void {
  triggerDownload(csvData, filename);
}
