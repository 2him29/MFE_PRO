import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant, tenants } from '../contexts/TenantContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { User, UserRole } from '../types';
import { mockUsers } from '../data/mockData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export default function Login() {
  const [step, setStep] = useState<'login' | 'company'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('tenant_admin');
  const [superAdminCode, setSuperAdminCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const { setCurrentTenant, setCurrentUser } = useTenant();
  const navigate = useNavigate();
  const superAdminUnlocked = superAdminCode === 'EV-SUPER-2026';
  const isSuperAdmin = role === 'super_admin';

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    // Mock login validation
    if (isSuperAdmin && !superAdminUnlocked) {
      setCodeError('Invalid Super Admin access code.');
      return;
    }
    setCodeError('');
    if (email && password) {
      setStep('company');
    }
  };

  const handleCompanySelect = (tenantId: 'sonelgaz' | 'saeig') => {
    const matchingUser = mockUsers.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
    const tenant = tenants[matchingUser?.tenantId || tenantId];
    setCurrentTenant(tenant);

    // Mock user creation
    const user: User = matchingUser
      ? {
          ...matchingUser,
          email,
        }
      : {
          id: '1',
          email,
          name: email.split('@')[0],
          role,
          tenantId,
        };
    setCurrentUser(user);

    navigate('/dashboard');
  };

  if (step === 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="text-4xl">EV</div>
              <h1 className="text-3xl font-bold text-white">EV Charge DZ</h1>
            </div>
            <p className="text-gray-300">Select your company to continue</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Sonelgaz Card */}
            <Card
              className="cursor-pointer transition-all hover:scale-105 hover:shadow-2xl border-2"
              style={{ borderColor: tenants.sonelgaz.accentColor }}
              onClick={() => handleCompanySelect('sonelgaz')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="p-3 rounded-lg flex items-center justify-center bg-white"
                    style={{ width: '80px', height: '80px' }}
                  >
                    {tenants.sonelgaz.logoImage ? (
                      <img
                        src={tenants.sonelgaz.logoImage}
                        alt="Sonelgaz Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-gray-700">
                        {tenants.sonelgaz.logo}
                      </span>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{tenants.sonelgaz.name}</CardTitle>
                    <CardDescription>National Energy Provider</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Active Stations:</span>
                    <span className="font-semibold">34</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coverage:</span>
                    <span className="font-semibold">16 Cities</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Capacity:</span>
                    <span className="font-semibold">4.2 MW</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SAEIG Card */}
            <Card
              className="cursor-pointer transition-all hover:scale-105 hover:shadow-2xl border-2"
              style={{ borderColor: tenants.saeig.accentColor }}
              onClick={() => handleCompanySelect('saeig')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="p-3 rounded-lg flex items-center justify-center bg-white"
                    style={{ width: '80px', height: '80px' }}
                  >
                    {tenants.saeig.logoImage ? (
                      <img
                        src={tenants.saeig.logoImage}
                        alt="SAEIG Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-gray-700">
                        {tenants.saeig.logo}
                      </span>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{tenants.saeig.name}</CardTitle>
                    <CardDescription>Industrial Services</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Active Stations:</span>
                    <span className="font-semibold">22</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coverage:</span>
                    <span className="font-semibold">12 Cities</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Capacity:</span>
                    <span className="font-semibold">3.8 MW</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-6">
            <Button variant="ghost" className="text-gray-300" onClick={() => setStep('login')}>
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-4xl">EV</div>
            <div>
              <CardTitle className="text-2xl">EV Charge DZ</CardTitle>
              <CardDescription>Admin Platform</CardDescription>
            </div>
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
                  if (value === 'EV-SUPER-2026') {
                    setCodeError('');
                    setRole('super_admin');
                  }
                  if (value !== 'EV-SUPER-2026' && role === 'super_admin') {
                    setRole('tenant_admin');
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Leave blank unless you are a Super Admin.
              </p>
              {codeError && (
                <p className="text-xs text-red-600">{codeError}</p>
              )}
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
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Demo Credentials:</strong> Use any email/password to continue
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
