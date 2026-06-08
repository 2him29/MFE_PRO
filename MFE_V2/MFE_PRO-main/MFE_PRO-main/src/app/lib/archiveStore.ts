const STORAGE_KEY = 'evcharge.archives';

export interface ArchiveEntry {
  id: string;
  exportType: string;
  filename: string;
  rowCount: number;
  exportedAt: string;
  exportedBy: string;
}

function load(): ArchiveEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(entries: ArchiveEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export const archiveStore = {
  list: (): ArchiveEntry[] => load(),

  add: (entry: Omit<ArchiveEntry, 'id' | 'exportedAt'>): ArchiveEntry => {
    const newEntry: ArchiveEntry = {
      ...entry,
      id: crypto.randomUUID(),
      exportedAt: new Date().toISOString(),
    };
    const entries = load();
    entries.unshift(newEntry);
    save(entries.slice(0, 500)); // keep last 500 records
    return newEntry;
  },

  clear: () => save([]),
};
