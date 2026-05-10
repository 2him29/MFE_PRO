import { NavLink } from 'react-router-dom';
import type { ComponentType } from 'react';
import { motion } from 'motion/react';
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
import { Sheet, SheetContent } from '../ui/sheet';
import { protectedRoutes, type ProtectedRouteId } from '../../config/navigation';

const routeIcons: Record<ProtectedRouteId, ComponentType<{ className?: string }>> =
  {
    dashboard: LayoutDashboard,
    stations: Zap,
    sessions: Activity,
    tickets: AlertCircle,
    myTasks: ClipboardCheck,
    billing: FileText,
    users: Users,
  };

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const { currentTenant, currentUser } = useTenant();

  const tenantGradient = currentTenant?.id === 'sonelgaz'
    ? 'from-orange-500 to-orange-600'
    : 'from-blue-600 to-blue-700';

  const visibleMenuItems = protectedRoutes.filter(
    (route) =>
      route.showInSidebar &&
      currentUser &&
      route.roles.includes(currentUser.role)
  );

  const tenantLogoImageClass = currentTenant?.id === 'sonelgaz'
    ? 'scale-[1.85] object-[50%_52%]'
    : 'scale-[1.15] object-center';

  const sidebarContent = (
    <div className="h-full w-full flex flex-col">
      {/* Logo with Gradient Background */}
      <div
        className={`border-b border-blue-900/40 bg-gradient-to-br px-5 py-4 ${tenantGradient}`}
      >
        <div className="flex items-center gap-3">
          {currentTenant?.logoImage ? (
            <div
              className="h-14 w-14 overflow-hidden rounded-xl border border-blue-100/70 bg-white/95 shadow-lg transition-transform hover:scale-105"
            >
              <img
                src={currentTenant.logoImage}
                alt={`${currentTenant.name} Logo`}
                className={`h-full w-full object-cover ${tenantLogoImageClass}`}
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
          {visibleMenuItems.map((item) => {
            const Icon = routeIcons[item.id];
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  onClick={() => onMobileOpenChange(false)}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <>
                          <motion.span
                            layoutId="sidebar-bg"
                            className="absolute inset-0 rounded-lg bg-gray-800"
                            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                          />
                          <motion.span
                            layoutId="sidebar-accent"
                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                            style={{ backgroundColor: currentTenant?.accentColor ?? '#6b7280' }}
                            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                          />
                        </>
                      )}
                      <Icon className="relative z-10 h-5 w-5" />
                      <span className="relative z-10">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">v1.0.0 MVP</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 bg-gray-900 text-white shadow-2xl md:flex">
        {sidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="!w-screen !max-w-none sm:!max-w-none !border-r-0 bg-gray-900 p-0 text-white [&>button]:text-white"
        >
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}

