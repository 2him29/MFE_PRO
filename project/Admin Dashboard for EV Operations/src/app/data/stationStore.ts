import { Station } from '../types';
import { mockStations } from './mockData';

const STORAGE_KEY = 'evcharge.stations';

export function loadStations(): Station[] {
  if (typeof window === 'undefined') return mockStations;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return mockStations;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return mockStations;
    return parsed as Station[];
  } catch {
    return mockStations;
  }
}

export function saveStations(stations: Station[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stations));
  } catch {
    // Ignore storage errors in demo mode
  }
}
