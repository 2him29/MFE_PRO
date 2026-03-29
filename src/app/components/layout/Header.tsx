import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Building2 } from 'lucide-react';
import { useTenant, tenants } from '../../contexts/TenantContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';

export function Header() {
  const { currentTenant, currentUser, setCurrentTenant, logout } = useTenant();
  const navigate = useNavigate();
  const [notificationCount] = useState(3);

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
      operator: 'Operator',
      support: 'Support',
    };
    return roleLabels[currentUser?.role || 'operator'];
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b shadow-sm flex items-center justify-between px-6 z-20">
      {/* Company Badge */}
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-xl border-2 shadow-md transition-all hover:shadow-lg"
          style={{
            borderColor: currentTenant?.accentColor || '#e5e7eb',
            background: currentTenant
              ? `linear-gradient(135deg, ${currentTenant.accentColor}15 0%, ${currentTenant.accentColor}05 100%)`
              : '#f9fafb',
          }}
        >
          {currentTenant?.logoImage ? (
            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm p-1">
              <img
                src={currentTenant.logoImage}
                alt={`${currentTenant.name} Logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <span className="text-2xl">{currentTenant?.logo}</span>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">{currentTenant?.name}</p>
            <p className="text-xs text-gray-500">Active Context</p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="text-xs font-semibold px-3 py-1"
          style={{
            borderColor: '#10b981',
            color: '#10b981',
            backgroundColor: '#f0fdf4',
          }}
        >
          PRODUCTION
        </Badge>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </Button>

        {/* Company Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" />
              Switch Company
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
                <p className="text-xs text-gray-500">National Energy Provider</p>
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
                <p className="text-xs text-gray-500">Industrial Services</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                {currentUser?.name?.charAt(0) || 'A'}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{currentUser?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">{getRoleBadge()}</p>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled>
              <div>
                <p className="font-medium">{currentUser?.email || 'admin@evcharge.dz'}</p>
                <p className="text-xs text-gray-500 mt-1">{getRoleBadge()}</p>
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
