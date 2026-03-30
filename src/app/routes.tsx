import { createBrowserRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { RequireAuth } from './components/auth/RequireAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stations from './pages/Stations';
import Sessions from './pages/Sessions';
import Tickets from './pages/Tickets';
import Billing from './pages/Billing';
import Users from './pages/Users';
import MyTasks from './pages/MyTasks';
import NotFound from './pages/NotFound';
import { UserRole } from './types';

const withRoles = (Component: ComponentType, allowedRoles: UserRole[]) => {
  return function RoleGuarded() {
    return (
      <RequireAuth allowedRoles={allowedRoles}>
        <Component />
      </RequireAuth>
    );
  };
};

const ProtectedLayout = () => (
  <RequireAuth>
    <DashboardLayout />
  </RequireAuth>
);

const AdminOnly = withRoles(Dashboard, ['super_admin', 'tenant_admin', 'technician']);
const StationsRoute = withRoles(Stations, ['super_admin', 'tenant_admin']);
const SessionsRoute = withRoles(Sessions, ['super_admin', 'tenant_admin']);
const TicketsRoute = withRoles(Tickets, ['super_admin', 'tenant_admin']);
const BillingRoute = withRoles(Billing, ['super_admin', 'tenant_admin']);
const UsersRoute = withRoles(Users, ['super_admin']);
const MyTasksRoute = withRoles(MyTasks, ['technician']);

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Login,
  },
  {
    path: '/',
    Component: ProtectedLayout,
    children: [
      {
        path: 'dashboard',
        Component: AdminOnly,
      },
      {
        path: 'stations',
        Component: StationsRoute,
      },
      {
        path: 'sessions',
        Component: SessionsRoute,
      },
      {
        path: 'tickets',
        Component: TicketsRoute,
      },
      {
        path: 'billing',
        Component: BillingRoute,
      },
      {
        path: 'users',
        Component: UsersRoute,
      },
      {
        path: 'my-tasks',
        Component: MyTasksRoute,
      },
      {
        path: '*',
        Component: NotFound,
      },
    ],
  },
]);
