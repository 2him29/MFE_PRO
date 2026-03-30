import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Activity,
  AlertCircle,
  FileText,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

const menuItems = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['super_admin', 'tenant_admin', 'technician'],
  },
  {
    path: '/stations',
    icon: Zap,
    label: 'Stations',
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    path: '/sessions',
    icon: Activity,
    label: 'Sessions',
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    path: '/tickets',
    icon: AlertCircle,
    label: 'Tasks & Incidents',
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    path: '/my-tasks',
    icon: ClipboardCheck,
    label: 'My Tasks',
    roles: ['technician'],
  },
  {
    path: '/billing',
    icon: FileText,
    label: 'Billing',
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    path: '/users',
    icon: Users,
    label: 'User Management',
    roles: ['super_admin'],
  },
];

export function Sidebar() {
  const { currentTenant, currentUser } = useTenant();

  const tenantGradient = currentTenant?.id === 'sonelgaz'
    ? 'from-green-600 to-green-700'
    : 'from-blue-600 to-blue-700';

  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(currentUser?.role || 'technician')
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col shadow-2xl">
      {/* Logo with Gradient Background */}
      <div
        className={`p-6 border-b border-gray-800 bg-gradient-to-br ${tenantGradient}`}
      >
        <div className="flex items-center gap-3">
          {currentTenant?.logoImage ? (
            <div
              className="p-3 rounded-xl bg-white shadow-lg flex items-center justify-center transform transition-transform hover:scale-105"
              style={{ width: '64px', height: '64px' }}
            >
              <img
                src={currentTenant.logoImage}
                alt={`${currentTenant.name} Logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div
              className="text-3xl p-3 rounded-xl transition-all shadow-lg hover:scale-105"
              style={{
                backgroundColor: currentTenant?.accentColor || '#6b7280',
              }}
            >
              EV
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg text-white drop-shadow-md">
              {currentTenant?.name || 'EV Charge DZ'}
            </h1>
            <p className="text-xs text-white/80">Admin Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {visibleMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
                style={({ isActive }) =>
                  isActive && currentTenant
                    ? {
                        borderLeft: `3px solid ${currentTenant.accentColor}`,
                      }
                    : {}
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">v1.0.0 MVP</p>
      </div>
    </aside>
  );
}

