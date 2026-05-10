import React, { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant, tenants } from '../contexts/TenantContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { TenantId, UserRole } from '../types';
import { authApi, saveToken } from '../services/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import loginBg from '../../assets/evcharge.png';
import evChargeLogo from '../../assets/logo1.png';

const SUPER_ADMIN_CODE = import.meta.env.VITE_SUPER_ADMIN_CODE as string;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('tenant_admin');
  const [superAdminCode, setSuperAdminCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<TenantId | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const { setCurrentTenant, setCurrentUser, setPendingAuth } = useTenant();
  const navigate = useNavigate();
  const superAdminUnlocked = superAdminCode === SUPER_ADMIN_CODE;
  const isSuperAdmin = role === 'super_admin';
  const emailDomain = email.split('@')[1]?.toLowerCase() || '';
  const companyFromEmail: TenantId | null =
    emailDomain.includes('sonelgaz') ? 'sonelgaz' :
    emailDomain.includes('saeig') ? 'saeig' : null;

  useEffect(() => {
    if (companyFromEmail) setSelectedCompany(companyFromEmail);
  }, [companyFromEmail]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (isSuperAdmin && !superAdminUnlocked) {
      setCodeError('Invalid Super Admin access code.');
      return;
    }
    if (!selectedCompany) {
      setCodeError('Please select a company to continue.');
      return;
    }
    setCodeError('');
    if (email && password) {
      try {
        const { token, user } = await authApi.login(email, password, selectedCompany);
        saveToken(token);
        const isBackendSuperAdmin = user.role === 'super_admin';
        const resolvedTenantId = isBackendSuperAdmin ? selectedCompany : user.tenantId as TenantId;
        const tenant = tenants[resolvedTenantId];

        if (!tenant) {
          setCodeError('Your account is not assigned to a valid company.');
          return;
        }

        if (!isBackendSuperAdmin && resolvedTenantId !== selectedCompany) {
          setCodeError('Selected company does not match this account.');
          return;
        }

        const sessionUser = isBackendSuperAdmin
          ? { ...user, tenantId: selectedCompany }
          : user;

        if (user.role === 'super_admin') {
          setPendingAuth({ user: sessionUser, tenant });
          navigate('/verify-otp');
        } else {
          setCurrentTenant(tenant);
          setCurrentUser(sessionUser);
          navigate(user.role === 'technician' ? '/my-tasks' : '/dashboard');
        }
      } catch (err: any) {
        setCodeError(err.message || 'Invalid credentials.');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-slate-900/85" />
      <Card className="relative z-10 w-full max-w-md bg-white/85 backdrop-blur-xl border border-white/40 shadow-[0_24px_70px_rgba(15,23,42,0.55)]">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={evChargeLogo} alt="EV Charge DZ Logo" className="h-16 w-auto" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">EV Charge DZ</CardTitle>
            <CardDescription>Admin Platform</CardDescription>
          </div>
          <CardDescription className="text-center">
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@evcharge.dz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="super-admin-code">Super Admin Access Code</Label>
              <Input
                id="super-admin-code"
                type="password"
                placeholder="Enter access code"
                value={superAdminCode}
                onChange={(e) => {
                  const value = e.target.value;
                  setSuperAdminCode(value);
                  if (value === SUPER_ADMIN_CODE) {
                    setCodeError('');
                    setRole('super_admin');
                  }
                  if (value !== SUPER_ADMIN_CODE && role === 'super_admin') {
                    setRole('tenant_admin');
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Leave blank unless you are a Super Admin.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {superAdminUnlocked && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                </SelectContent>
              </Select>
              {!superAdminUnlocked && (
                <p className="text-xs text-gray-500">
                  Super Admin is locked without the access code.
                </p>
              )}
            </div>

            {/* Company Selection */}
            <div className="space-y-2">
              <Label>Select Company</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['sonelgaz', 'saeig'] as TenantId[]).map((id) => {
                  const tenant = tenants[id];
                  const isSelected = selectedCompany === id;
                  const isLocked = companyFromEmail !== null && companyFromEmail !== id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => setSelectedCompany(id)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                        isLocked
                          ? 'cursor-not-allowed opacity-35 border-gray-200 bg-gray-100'
                          : isSelected
                          ? 'cursor-pointer shadow-md scale-[1.02]'
                          : 'cursor-pointer border-gray-200 bg-white/60 hover:border-gray-300 hover:bg-white/80'
                      }`}
                      style={
                        isSelected && !isLocked
                          ? {
                              borderColor: tenant.accentColor,
                              background: `linear-gradient(135deg, ${tenant.accentColor}18 0%, white 100%)`,
                            }
                          : undefined
                      }
                    >
                      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-white p-1 shadow-sm">
                        {tenant.logoImage ? (
                          <img
                            src={tenant.logoImage}
                            alt={`${tenant.name} Logo`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-gray-700">{tenant.logo}</span>
                        )}
                      </div>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isSelected && !isLocked ? tenant.accentColor : undefined }}
                      >
                        {tenant.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {codeError && (
              <p className="text-xs text-red-600">{codeError}</p>
            )}

            <div className={`btn-electric-wrap w-full${isHovered ? ' is-hovered' : ''}`}>
              <Button
                type="submit"
                className="btn-electric relative w-full overflow-hidden"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onMouseMove={handleMouseMove}
              >
                <span
                  className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                  style={{
                    opacity: isHovered ? 1 : 0,
                    background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(56,189,248,0.45) 0%, rgba(129,140,248,0.2) 45%, transparent 70%)`,
                  }}
                />
                <span className="relative z-10">Sign In</span>
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              Use an active backend account. Wrong passwords are rejected.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
