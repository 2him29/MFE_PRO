import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Building2, Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { formatDistanceToNow } from 'date-fns';
import { useTenant, tenants } from '../../contexts/TenantContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import type { AppNotification } from '../../types';
import {
  getVisibleNotifications,
  isNotificationRead,
  loadNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  saveNotifications,
} from '../../data/notificationStore';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { currentTenant, currentUser, setCurrentTenant, logout } = useTenant();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadNotifications()
  );
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const handleTenantSwitch = (tenantId: 'sonelgaz' | 'saeig') => {
    setCurrentTenant(tenants[tenantId]);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleBadge = () => {
    const roleLabels = {
      super_admin: 'Super Admin',
      tenant_admin: 'Tenant Admin',
      technician: 'Technician',
    };
    return roleLabels[currentUser?.role || 'technician'];
  };

  const canSwitchTenant = currentUser?.role === 'super_admin';
  const visibleNotifications = getVisibleNotifications(
    notifications,
    currentUser,
    currentTenant
  );
  const unreadCount = visibleNotifications.filter(
    (notification) => !isNotificationRead(notification, currentUser?.id)
  ).length;

  const getSeverityDotClass = (severity: AppNotification['severity']) => {
    if (severity === 'error') return 'bg-red-500';
    if (severity === 'warning') return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const canOpenNotificationRoute = (route: AppNotification['route']) => {
    if (!currentUser) return false;
    if (route === '/dashboard') return true;
    if (route === '/my-tasks') return currentUser.role === 'technician';
    return currentUser.role === 'super_admin' || currentUser.role === 'tenant_admin';
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!currentUser) return;

    setNotifications((prev) =>
      markNotificationAsRead(prev, notification.id, currentUser.id)
    );

    if (
      currentUser.role === 'super_admin' &&
      notification.tenantId !== currentTenant?.id
    ) {
      setCurrentTenant(tenants[notification.tenantId]);
    }

    if (canOpenNotificationRoute(notification.route)) {
      navigate(`${notification.route}?notification=${notification.id}`);
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => markAllNotificationsAsRead(prev, currentUser?.id));
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-3 shadow-sm transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 md:left-64 md:px-6">
      {/* Company Badge */}
      <div className="flex min-w-0 items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div
          className="flex min-w-0 items-center gap-2 rounded-xl border-2 px-2 py-1.5 shadow-md transition-all hover:shadow-lg md:gap-3 md:px-4 md:py-2"
          style={{
            borderColor: currentTenant?.accentColor || '#e5e7eb',
            background: currentTenant
              ? `linear-gradient(135deg, ${currentTenant.accentColor}15 0%, ${currentTenant.accentColor}05 100%)`
              : isDark ? '#1f2937' : '#f9fafb',
          }}
        >
          {currentTenant?.logoImage ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1 shadow-sm dark:bg-gray-800 md:h-10 md:w-10">
              <img
                src={currentTenant.logoImage}
                alt={`${currentTenant.name} Logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <span className="text-2xl">{currentTenant?.logo}</span>
          )}
          <div className="min-w-0">
            <p className="max-w-[120px] truncate text-xs font-semibold text-gray-900 dark:text-white md:max-w-none md:text-sm">
              {currentTenant?.name}
            </p>
            <p className="hidden text-xs text-gray-500 dark:text-gray-400 md:block">Active Context</p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="hidden px-3 py-1 text-xs font-semibold text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700 sm:inline-flex"
        >
          PRODUCTION
        </Badge>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label="Toggle dark mode"
          className="relative overflow-hidden"
        >
          <Sun className={`h-5 w-5 transition-all duration-300 ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'} absolute`} />
          <Moon className={`h-5 w-5 transition-all duration-300 ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'} absolute`} />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[360px] p-0">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <DropdownMenuLabel className="px-0 py-0 text-sm font-semibold">
                Notifications
              </DropdownMenuLabel>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleMarkAllNotificationsAsRead}
                disabled={unreadCount === 0}
              >
                Mark all read
              </Button>
            </div>

            {visibleNotifications.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No notifications for your current role and tenant.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto p-1">
                {visibleNotifications.slice(0, 8).map((notification) => {
                  const isRead = isNotificationRead(notification, currentUser?.id);
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className="items-start gap-3 rounded-md px-2 py-2"
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${getSeverityDotClass(
                          notification.severity
                        )}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`truncate text-sm ${
                              isRead
                                ? 'font-medium text-muted-foreground'
                                : 'font-semibold text-foreground'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            )}

            <DropdownMenuSeparator />
            <p className="px-3 py-2 text-[11px] text-muted-foreground">
              Click a notification to open the related page.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Company Switcher */}
        {canSwitchTenant && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 px-2 md:px-3">
                <Building2 className="h-4 w-4" />
                <span className="hidden md:inline">Switch Company</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => handleTenantSwitch('sonelgaz')}
                className="gap-2"
              >
                {tenants.sonelgaz.logoImage ? (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <img
                      src={tenants.sonelgaz.logoImage}
                      alt="Sonelgaz Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <span className="text-lg">{tenants.sonelgaz.logo}</span>
                )}
                <div>
                  <p className="font-medium">{tenants.sonelgaz.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">National Energy Provider</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleTenantSwitch('saeig')}
                className="gap-2"
              >
                {tenants.saeig.logoImage ? (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <img
                      src={tenants.saeig.logoImage}
                      alt="SAEIG Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <span className="text-lg">{tenants.saeig.logo}</span>
                )}
                <div>
                  <p className="font-medium">{tenants.saeig.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Industrial Services</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 md:px-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                {currentUser?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">{currentUser?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleBadge()}</p>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled>
              <div>
                <p className="font-medium">{currentUser?.email || 'admin@evcharge.dz'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getRoleBadge()}</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
