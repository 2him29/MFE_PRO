import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Tenant, TenantId, User } from '../types';
import { clearToken, getToken } from '../services/api';
import saeigLogo from '../../assets/198be664671f0d576c88319af1aa885e47226781.png';
import sonelgazLogo from '../../assets/sonelgaz-logo.png';

export interface PendingAuth {
  user: User;
  tenant: Tenant;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  currentUser: User | null;
  setCurrentTenant: (tenant: Tenant) => void;
  setCurrentUser: (user: User) => void;
  logout: () => void;
  /** Set after first-factor success for super_admin, cleared after OTP success. Never persisted. */
  pendingAuth: PendingAuth | null;
  setPendingAuth: (auth: PendingAuth) => void;
  clearPendingAuth: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);
const SESSION_STORAGE_KEY = 'evcharge.session';

export const tenants: Record<TenantId, Tenant> = {
  sonelgaz: {
    id: 'sonelgaz',
    name: 'Sonelgaz',
    logo: 'SG',
    logoImage: sonelgazLogo,
    accentColor: '#f97316',
    accentColorDark: '#ea580c',
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

interface StoredSession {
  tenantId: TenantId;
  user: User;
}

function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function loadStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    if (isTokenExpired()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      clearToken();
      return null;
    }
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as StoredSession;
    if (!parsed?.tenantId || !parsed?.user) return null;
    if (!tenants[parsed.tenantId]) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    const session = loadStoredSession();
    return session ? tenants[session.tenantId] : null;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const session = loadStoredSession();
    return session?.user ?? null;
  });
  // pendingAuth is intentionally NOT persisted — if the page is refreshed mid-OTP the user restarts login
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
  const clearPendingAuth = () => setPendingAuth(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!currentTenant || !currentUser) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    const session: StoredSession = {
      tenantId: currentTenant.id,
      user: currentUser,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [currentTenant, currentUser]);

  const logout = () => {
    setCurrentTenant(null);
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      clearToken();
    }
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        currentUser,
        setCurrentTenant,
        setCurrentUser,
        logout,
        pendingAuth,
        setPendingAuth,
        clearPendingAuth,
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
