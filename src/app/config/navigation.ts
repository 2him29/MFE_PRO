import { UserRole } from '../types';

export type ProtectedRouteId =
  | 'dashboard'
  | 'stations'
  | 'sessions'
  | 'tickets'
  | 'billing'
  | 'users'
  | 'myTasks';

export interface ProtectedRouteConfig {
  id: ProtectedRouteId;
  path: string;
  label: string;
  roles: UserRole[];
  showInSidebar: boolean;
}

export const protectedRoutes: ProtectedRouteConfig[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    roles: ['super_admin', 'tenant_admin', 'technician'],
    showInSidebar: true,
  },
  {
    id: 'stations',
    path: '/stations',
    label: 'Stations',
    roles: ['super_admin', 'tenant_admin'],
    showInSidebar: true,
  },
  {
    id: 'sessions',
    path: '/sessions',
    label: 'Sessions',
    roles: ['super_admin', 'tenant_admin'],
    showInSidebar: true,
  },
  {
    id: 'tickets',
    path: '/tickets',
    label: 'Tasks & Incidents',
    roles: ['super_admin', 'tenant_admin'],
    showInSidebar: true,
  },
  {
    id: 'billing',
    path: '/billing',
    label: 'Billing',
    roles: ['super_admin', 'tenant_admin'],
    showInSidebar: true,
  },
  {
    id: 'users',
    path: '/users',
    label: 'User Management',
    roles: ['super_admin'],
    showInSidebar: true,
  },
  {
    id: 'myTasks',
    path: '/my-tasks',
    label: 'My Tasks',
    roles: ['technician'],
    showInSidebar: true,
  },
];
