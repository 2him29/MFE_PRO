export type EntityType = 'users' | 'tickets' | 'stations' | 'sessions' | 'billing';

export interface ArchiveEntry {
  id: string;
  entity: EntityType;
  filename: string;
  exportedAt: string;
  exportedBy: string;
  rowCount: number;
  tenant: string;
  csvData: string;
}

const STORAGE_KEY = 'evcharge.archives';

export function loadArchives(): ArchiveEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ArchiveEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveArchives(entries: ArchiveEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addArchive(entry: Omit<ArchiveEntry, 'id'>): ArchiveEntry {
  const newEntry: ArchiveEntry = { id: `ARC-${Date.now()}`, ...entry };
  saveArchives([newEntry, ...loadArchives()]);
  return newEntry;
}

export function deleteArchive(id: string): void {
  saveArchives(loadArchives().filter((e) => e.id !== id));
}
