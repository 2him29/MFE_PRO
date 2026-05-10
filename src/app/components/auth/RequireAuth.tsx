import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { UserRole } from '../../types';

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export function RequireAuth({
  children,
  allowedRoles,
  redirectTo = '/',
}: RequireAuthProps) {
  const { currentUser } = useTenant();

  if (!currentUser) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
