import { User } from '../types';
import { mockUsers } from './mockData';

const STORAGE_KEY = 'evcharge.users';

export function loadUsers(): User[] {
  if (typeof window === 'undefined') return mockUsers;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return mockUsers;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return mockUsers;
    return parsed as User[];
  } catch {
    return mockUsers;
  }
}

export function saveUsers(users: User[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage errors in demo mode
  }
}
