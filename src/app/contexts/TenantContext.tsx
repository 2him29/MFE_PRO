import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Tenant, TenantId, User } from '../types';
import saeigLogo from '../../assets/198be664671f0d576c88319af1aa885e47226781.png';

interface TenantContextType {
  currentTenant: Tenant | null;
  currentUser: User | null;
  setCurrentTenant: (tenant: Tenant) => void;
  setCurrentUser: (user: User) => void;
  logout: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const tenants: Record<TenantId, Tenant> = {
  sonelgaz: {
    id: 'sonelgaz',
    name: 'Sonelgaz',
    logo: 'SG',
    accentColor: '#16a34a',
    accentColorDark: '#15803d',
  },
  saeig: {
    id: 'saeig',
    name: 'SAEIG',
    logo: 'SE',
    logoImage: saeigLogo,
    accentColor: '#2563eb',
    accentColorDark: '#1d4ed8',
  },
};

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const logout = () => {
    setCurrentTenant(null);
    setCurrentUser(null);
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        currentUser,
        setCurrentTenant,
        setCurrentUser,
        logout,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
