import React, { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTenant, tenants } from '../contexts/TenantContext';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { TenantId, User, UserRole } from '../types';
import { authApi, setToken } from '../lib/api';
import { otpService } from '../lib/otpService';
import { SUPER_ADMIN_CODE } from '../lib/env';
import loginBg from '../../assets/evcharge.png';
import projectLogo from '../../assets/logo1.png';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PendingAuth {
  token: string;
  user: User;
  tenantId: TenantId;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Login() {
  // Login form state
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [role, setRole]                     = useState<UserRole>('tenant_admin');
  const [superAdminCode, setSuperAdminCode] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<TenantId | null>(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [errorMsg, setErrorMsg]             = useState('');

  // OTP step state
  const [otpStep, setOtpStep]   = useState(false);
  const [otpCode, setOtpCode]   = useState('');
  const [demoOtp, setDemoOtp]   = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);

  const [showSuperAdminField, setShowSuperAdminField] = useState(false);

  // Hover / mouse-tracking state
  const [isHovered, setIsHovered]         = useState(false);
  const [mousePos, setMousePos]           = useState({ x: 50, y: 50 });
  const [hoveredTenant, setHoveredTenant] = useState<TenantId | null>(null);
  const [tenantMousePos, setTenantMousePos] = useState<Record<TenantId, { x: number; y: number }>>({
    sonelgaz: { x: 50, y: 50 },
    saeig:    { x: 50, y: 50 },
  });

  const { setCurrentTenant, setCurrentUser } = useTenant();
  const navigate = useNavigate();

  const superAdminUnlocked = superAdminCode === SUPER_ADMIN_CODE;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function commitLogin(pending: PendingAuth) {
    setToken(pending.token);
    setCurrentTenant(tenants[pending.tenantId]);
    setCurrentUser({ ...pending.user, tenantId: pending.tenantId });
    navigate(pending.user.role === 'technician' ? '/my-tasks' : '/dashboard');
  }

  // ── Login submit ───────────────────────────────────────────────────────────

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      setErrorMsg('Please select your company (Sonelgaz or SAEIG) below.');
      return;
    }
    if (!email || !password) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const resp = await authApi.login(email.trim(), password);

      const user: User = {
        id:       resp.user.id,
        email:    resp.user.email,
        name:     resp.user.name,
        role:     resp.user.role,
        tenantId: (resp.user.tenantId as TenantId) ?? selectedTenantId,
        status:   resp.user.status ?? 'active',
      };

      if (user.role === 'super_admin' && superAdminCode.trim() !== SUPER_ADMIN_CODE) {
        setErrorMsg('Super Admin Access Code is required and must be valid.');
        toast.error('Super Admin Access Code is required and must be valid.');
        return;
      }

      const resolvedTenantId: TenantId =
        user.role === 'super_admin'
          ? selectedTenantId
          : (user.tenantId ?? selectedTenantId);

      const pending: PendingAuth = { token: resp.token, user, tenantId: resolvedTenantId };

      if (user.role === 'super_admin') {
        // Super admin: password + access code + OTP (3-factor)
        setPendingAuth(pending);
        const otpResp = await otpService.request(email.trim());
        setDemoOtp(otpResp.demoCode ?? '');
        setOtpStep(true);
      } else {
        // Tenant admin / technician: password only
        commitLogin(pending);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── OTP verify ────────────────────────────────────────────────────────────

  const handleOtpVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingAuth) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const result = await otpService.verify(pendingAuth.user.email, otpCode.trim());
      if (result.valid) {
        commitLogin(pendingAuth);
      } else {
        const msg =
          result.reason === 'locked'  ? 'Too many attempts. Please log in again.' :
          result.reason === 'expired' ? 'Code expired. Please log in again.' :
                                        'Invalid code. Please try again.';
        setOtpError(msg);
        if (result.reason === 'locked' || result.reason === 'expired') {
          setOtpStep(false);
          setPendingAuth(null);
          setOtpCode('');
        }
      }
    } catch {
      setOtpError('Verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Mouse tracking helpers ────────────────────────────────────────────────

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  // ── OTP step render ───────────────────────────────────────────────────────

  if (otpStep) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-slate-900/85" />

        <Card className="relative z-10 w-full max-w-sm bg-white/85 backdrop-blur-xl border border-white/40 shadow-[0_24px_70px_rgba(15,23,42,0.55)]">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={projectLogo} alt="EV Charge DZ" className="h-20 w-20 object-contain" />
            </div>
            <CardTitle className="text-center text-xl">Two-Factor Verification</CardTitle>
            <CardDescription className="text-center text-sm">
              Enter the 6-digit code sent to <strong>{pendingAuth?.user.email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(val) => setOtpCode(val)}
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {demoOtp && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-800">
                    <strong>Demo mode:</strong> your code is{' '}
                    <code className="font-bold tracking-widest">{demoOtp}</code>
                  </p>
                </div>
              )}

              {otpError && (
                <p className="text-sm text-red-600">{otpError}</p>
              )}

              <Button
                type="submit"
                disabled={otpLoading || otpCode.length < 6}
                className="w-full"
              >
                {otpLoading ? 'Verifying…' : 'Verify & Sign In'}
              </Button>

              <button
                type="button"
                onClick={() => { setOtpStep(false); setPendingAuth(null); setOtpCode(''); setDemoOtp(''); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back to login
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main login render ─────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-slate-900/85" />

      {/* Login card */}
      <Card className="relative z-10 w-full max-w-md bg-white/85 backdrop-blur-xl border border-white/40 shadow-[0_24px_70px_rgba(15,23,42,0.55)]">
        <CardHeader className="space-y-1 pb-4 text-center">
          <div className="flex flex-col items-center gap-3 mb-1">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-blue-400/25 blur-xl scale-125" />
              <img src={projectLogo} alt="EV Charge DZ" className="relative h-36 w-36 object-contain drop-shadow-md" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                EV Charge DZ
              </CardTitle>
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 tracking-wide">
                Admin Console
              </span>
            </div>
          </div>
          <CardDescription className="text-center text-sm pt-1">
            Sign in to manage your charging network
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Super admin code — hidden behind toggle */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowSuperAdminField((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showSuperAdminField ? '▾ Hide super admin field' : '▸ Super Admin? Enter access code'}
              </button>
              {showSuperAdminField && (
                <div className="space-y-1 pt-1">
                  <Label htmlFor="super-admin-code" className="text-xs">Access Code</Label>
                  <Input
                    id="super-admin-code"
                    type="password"
                    placeholder="EV-SUPER-XXXX"
                    value={superAdminCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSuperAdminCode(val);
                      if (val === SUPER_ADMIN_CODE) setRole('super_admin');
                      else if (role === 'super_admin') setRole('tenant_admin');
                    }}
                    autoComplete="off"
                  />
                </div>
              )}
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
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
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}

            {/* Sign In button */}
            <div className={`btn-electric-wrap w-full${isHovered ? ' is-hovered' : ''}`}>
              <Button
                type="submit"
                disabled={isSubmitting}
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
                <span className="relative z-10">
                  {isSubmitting ? 'Signing in…' : 'Sign In'}
                </span>
              </Button>
            </div>

            {/* ── Company selector ────────────────────────────────────── */}
            <div className="pt-2">
              <div className="relative flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 whitespace-nowrap">Select your company</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Sonelgaz — electric orange hover */}
                <button
                  type="button"
                  onClick={() => setSelectedTenantId('sonelgaz')}
                  onMouseEnter={() => setHoveredTenant('sonelgaz')}
                  onMouseLeave={() => setHoveredTenant(null)}
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setTenantMousePos((p) => ({
                      ...p,
                      sonelgaz: {
                        x: ((e.clientX - r.left) / r.width)  * 100,
                        y: ((e.clientY - r.top)  / r.height) * 100,
                      },
                    }));
                  }}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 overflow-hidden transition-all duration-200 bg-white"
                  style={{
                    borderColor:
                      selectedTenantId === 'sonelgaz' || hoveredTenant === 'sonelgaz'
                        ? tenants.sonelgaz.accentColor : '#e5e7eb',
                    boxShadow:
                      selectedTenantId === 'sonelgaz'
                        ? `0 0 18px 4px ${tenants.sonelgaz.accentColor}60, 0 0 0 3px ${tenants.sonelgaz.accentColor}30`
                        : undefined,
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                    style={{
                      opacity: hoveredTenant === 'sonelgaz' ? 1 : 0,
                      background: `radial-gradient(circle at ${tenantMousePos.sonelgaz.x}% ${tenantMousePos.sonelgaz.y}%, rgba(249,115,22,0.35) 0%, rgba(251,146,60,0.15) 45%, transparent 70%)`,
                    }}
                  />
                  <div className="relative w-14 h-14 flex items-center justify-center rounded-xl bg-white border border-gray-100 p-1.5">
                    {tenants.sonelgaz.logoImage ? (
                      <img src={tenants.sonelgaz.logoImage} alt="Sonelgaz" className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-bold text-base" style={{ color: tenants.sonelgaz.accentColor }}>
                        {tenants.sonelgaz.logo}
                      </span>
                    )}
                  </div>
                  <span
                    className="relative text-xs font-semibold transition-colors duration-200"
                    style={{
                      color: selectedTenantId === 'sonelgaz' || hoveredTenant === 'sonelgaz'
                        ? tenants.sonelgaz.accentColor : '#374151',
                    }}
                  >
                    Sonelgaz
                  </span>
                </button>

                {/* SAEIG — electric blue hover */}
                <button
                  type="button"
                  onClick={() => setSelectedTenantId('saeig')}
                  onMouseEnter={() => setHoveredTenant('saeig')}
                  onMouseLeave={() => setHoveredTenant(null)}
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setTenantMousePos((p) => ({
                      ...p,
                      saeig: {
                        x: ((e.clientX - r.left) / r.width)  * 100,
                        y: ((e.clientY - r.top)  / r.height) * 100,
                      },
                    }));
                  }}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 overflow-hidden transition-all duration-200 bg-white"
                  style={{
                    borderColor:
                      selectedTenantId === 'saeig' || hoveredTenant === 'saeig'
                        ? tenants.saeig.accentColor : '#e5e7eb',
                    boxShadow:
                      selectedTenantId === 'saeig'
                        ? `0 0 18px 4px ${tenants.saeig.accentColor}60, 0 0 0 3px ${tenants.saeig.accentColor}30`
                        : undefined,
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                    style={{
                      opacity: hoveredTenant === 'saeig' ? 1 : 0,
                      background: `radial-gradient(circle at ${tenantMousePos.saeig.x}% ${tenantMousePos.saeig.y}%, rgba(37,99,235,0.35) 0%, rgba(96,165,250,0.15) 45%, transparent 70%)`,
                    }}
                  />
                  <div className="relative w-14 h-14 flex items-center justify-center rounded-xl bg-white border border-gray-100 p-1.5">
                    {tenants.saeig.logoImage ? (
                      <img src={tenants.saeig.logoImage} alt="SAEIG" className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-bold text-base" style={{ color: tenants.saeig.accentColor }}>
                        {tenants.saeig.logo}
                      </span>
                    )}
                  </div>
                  <span
                    className="relative text-xs font-semibold transition-colors duration-200"
                    style={{
                      color: selectedTenantId === 'saeig' || hoveredTenant === 'saeig'
                        ? tenants.saeig.accentColor : '#374151',
                    }}
                  >
                    SAEIG
                  </span>
                </button>
              </div>
            </div>
            {/* ── End company selector ────────────────────────────────── */}
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
