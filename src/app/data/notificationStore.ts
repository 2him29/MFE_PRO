import type { AppNotification, Tenant, User } from '../types';

const STORAGE_KEY = 'evcharge.notifications';

type SerializedNotification = Omit<AppNotification, 'createdAt'> & {
  createdAt: string;
};

function createDefaultNotifications(): AppNotification[] {
  const now = Date.now();
  return [
    {
      id: 'NTF-001',
      title: 'Station Offline',
      message: 'Tlemcen Gateway has been offline for more than 2 hours.',
      severity: 'error',
      category: 'station_offline',
      createdAt: new Date(now - 9 * 60 * 1000),
      tenantId: 'saeig',
      route: '/tickets',
      entityId: 'STN-006',
      targetRoles: ['super_admin', 'tenant_admin'],
      readBy: [],
    },
    {
      id: 'NTF-002',
      title: 'Connector Fault',
      message: 'Constantine Plaza reported charger fault on CCS2-02.',
      severity: 'error',
      category: 'charger_fault',
      createdAt: new Date(now - 24 * 60 * 1000),
      tenantId: 'sonelgaz',
      route: '/tickets',
      entityId: 'TKT-4501',
      targetRoles: ['super_admin', 'tenant_admin'],
      readBy: [],
    },
    {
      id: 'NTF-003',
      title: 'Payment Failures Spiking',
      message: 'CIB payment failures crossed threshold at Annaba Port Station.',
      severity: 'warning',
      category: 'payment_failed',
      createdAt: new Date(now - 38 * 60 * 1000),
      tenantId: 'saeig',
      route: '/billing',
      entityId: 'INV-2014',
      targetRoles: ['super_admin', 'tenant_admin'],
      readBy: [],
    },
    {
      id: 'NTF-004',
      title: 'Session Interrupted',
      message: 'Active charging session SES-1006 ended unexpectedly.',
      severity: 'warning',
      category: 'session_failed',
      createdAt: new Date(now - 55 * 60 * 1000),
      tenantId: 'sonelgaz',
      route: '/sessions',
      entityId: 'SES-1006',
      targetRoles: ['super_admin', 'tenant_admin'],
      readBy: [],
    },
    {
      id: 'NTF-005',
      title: 'SLA Breach Risk',
      message: 'Ticket TKT-4502 is close to SLA deadline. Field action required.',
      severity: 'warning',
      category: 'sla_breach',
      createdAt: new Date(now - 71 * 60 * 1000),
      tenantId: 'saeig',
      route: '/my-tasks',
      entityId: 'TKT-4502',
      targetRoles: ['technician'],
      readBy: [],
    },
    {
      id: 'NTF-006',
      title: 'Ticket Escalated',
      message: 'Ticket TKT-4505 was escalated due to repeated voltage anomalies.',
      severity: 'error',
      category: 'ticket_escalated',
      createdAt: new Date(now - 96 * 60 * 1000),
      tenantId: 'saeig',
      route: '/my-tasks',
      entityId: 'TKT-4505',
      targetRoles: ['technician'],
      readBy: [],
    },
    {
      id: 'NTF-007',
      title: 'Platform Update',
      message: 'Smart charging optimization rules were updated successfully.',
      severity: 'info',
      category: 'system_update',
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
      tenantId: 'sonelgaz',
      route: '/dashboard',
      targetRoles: ['super_admin', 'tenant_admin', 'technician'],
      readBy: ['USR-001'],
    },
  ];
}

function serializeNotification(notification: AppNotification): SerializedNotification {
  return {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  };
}

function hydrateDate(value: string | Date | undefined, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function hydrateNotification(raw: Partial<SerializedNotification>): AppNotification | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string') return null;
  if (typeof raw.title !== 'string') return null;
  if (typeof raw.message !== 'string') return null;
  if (typeof raw.severity !== 'string') return null;
  if (typeof raw.category !== 'string') return null;
  if (typeof raw.tenantId !== 'string') return null;
  if (typeof raw.route !== 'string') return null;

  return {
    ...(raw as AppNotification),
    createdAt: hydrateDate(raw.createdAt, new Date()),
    readBy: Array.isArray(raw.readBy)
      ? raw.readBy.filter((value): value is string => typeof value === 'string')
      : [],
  };
}

export function loadNotifications(): AppNotification[] {
  const defaults = createDefaultNotifications();
  if (typeof window === 'undefined') return defaults;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults;

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return defaults;

    const hydrated = parsed
      .map((item) => hydrateNotification(item))
      .filter((item): item is AppNotification => item !== null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return hydrated.length > 0 ? hydrated : defaults;
  } catch {
    return defaults;
  }
}

export function saveNotifications(notifications: AppNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = notifications.map(serializeNotification);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Ignore storage errors in demo mode
  }
}

export function isNotificationRead(notification: AppNotification, userId?: string): boolean {
  if (!userId) return true;
  return notification.readBy.includes(userId);
}

export function markNotificationAsRead(
  notifications: AppNotification[],
  notificationId: string,
  userId?: string
): AppNotification[] {
  if (!userId) return notifications;
  return notifications.map((notification) => {
    if (notification.id !== notificationId) return notification;
    if (notification.readBy.includes(userId)) return notification;
    return {
      ...notification,
      readBy: [...notification.readBy, userId],
    };
  });
}

export function markAllNotificationsAsRead(
  notifications: AppNotification[],
  userId?: string
): AppNotification[] {
  if (!userId) return notifications;
  return notifications.map((notification) => {
    if (notification.readBy.includes(userId)) return notification;
    return {
      ...notification,
      readBy: [...notification.readBy, userId],
    };
  });
}

export function getVisibleNotifications(
  notifications: AppNotification[],
  currentUser: User | null,
  currentTenant: Tenant | null
): AppNotification[] {
  if (!currentUser) return [];

  const scoped = notifications.filter((notification) => {
    if (
      Array.isArray(notification.targetRoles) &&
      notification.targetRoles.length > 0 &&
      !notification.targetRoles.includes(currentUser.role)
    ) {
      return false;
    }

    if (currentUser.role === 'super_admin') return true;
    const activeTenantId = currentTenant?.id ?? currentUser.tenantId;
    return notification.tenantId === activeTenantId;
  });

  return scoped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
