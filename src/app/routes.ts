import { createBrowserRouter } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stations from './pages/Stations';
import Sessions from './pages/Sessions';
import Tickets from './pages/Tickets';
import Billing from './pages/Billing';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Login,
  },
  {
    path: '/',
    Component: DashboardLayout,
    children: [
      {
        path: 'dashboard',
        Component: Dashboard,
      },
      {
        path: 'stations',
        Component: Stations,
      },
      {
        path: 'sessions',
        Component: Sessions,
      },
      {
        path: 'tickets',
        Component: Tickets,
      },
      {
        path: 'billing',
        Component: Billing,
      },
      {
        path: '*',
        Component: NotFound,
      },
    ],
  },
]);
