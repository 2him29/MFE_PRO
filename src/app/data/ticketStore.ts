import { Ticket } from '../types';
import { mockTickets } from './mockData';

const STORAGE_KEY = 'evcharge.tickets';

type SerializedTicket = Omit<Ticket, 'createdAt' | 'updatedAt' | 'slaDeadline'> & {
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
};

function serializeTicket(ticket: Ticket): SerializedTicket {
  return {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    slaDeadline: ticket.slaDeadline.toISOString(),
  };
}

function hydrateDate(value: string | Date | undefined, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function hydrateTicket(
  raw: Partial<SerializedTicket>,
  fallbackBase: Ticket | null = null
): Ticket | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string') return null;
  if (typeof raw.title !== 'string') return null;
  if (typeof raw.description !== 'string') return null;
  if (typeof raw.stationName !== 'string') return null;
  if (typeof raw.tenantId !== 'string') return null;
  if (typeof raw.status !== 'string') return null;
  if (typeof raw.priority !== 'string') return null;
  if (typeof raw.category !== 'string') return null;

  const now = new Date();
  const fallbackCreatedAt = fallbackBase?.createdAt ?? now;
  const fallbackUpdatedAt = fallbackBase?.updatedAt ?? now;
  const fallbackDeadline = fallbackBase?.slaDeadline ?? now;

  return {
    ...(raw as Ticket),
    createdAt: hydrateDate(raw.createdAt, fallbackCreatedAt),
    updatedAt: hydrateDate(raw.updatedAt, fallbackUpdatedAt),
    slaDeadline: hydrateDate(raw.slaDeadline, fallbackDeadline),
    assignedTo:
      raw.assignedTo === null || typeof raw.assignedTo === 'string'
        ? raw.assignedTo
        : null,
    assignedToId:
      raw.assignedToId === null || typeof raw.assignedToId === 'string'
        ? raw.assignedToId
        : null,
  };
}

export function loadTickets(): Ticket[] {
  if (typeof window === 'undefined') return mockTickets;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return mockTickets;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return mockTickets;
    const tickets = parsed
      .map((raw) => hydrateTicket(raw))
      .filter((ticket): ticket is Ticket => ticket !== null);
    return tickets.length > 0 ? tickets : mockTickets;
  } catch {
    return mockTickets;
  }
}

export function saveTickets(tickets: Ticket[]) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = tickets.map(serializeTicket);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Ignore storage errors in demo mode
  }
}
