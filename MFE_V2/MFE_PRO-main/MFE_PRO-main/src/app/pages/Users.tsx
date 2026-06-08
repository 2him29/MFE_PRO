import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, ShieldCheck, Wrench, UserCog, RefreshCw, Download, Users as UsersIcon, Check, Settings2 } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { PageHeader } from '../components/dashboard/PageHeader';
import { EmptyState } from '../components/dashboard/EmptyState';
import { Button } from '../components/ui/button';
import { SideDrawer } from '../components/dashboard/SideDrawer';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { TableSkeleton } from '../components/dashboard/LoadingState';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { ApiUser, usersApi } from '../lib/api';
import { getErrorMessage, isAbortError } from '../lib/utils';
import { exportToCsv } from '../lib/csvExport';
import { format } from 'date-fns';
import { UserRole } from '../types';
import { toast } from 'sonner';

const roleLabels: Record<UserRole, string> = {
  super_admin:  'Super Admin',
  tenant_admin: 'Tenant Admin',
  technician:   'Technician',
};

const PRIVILEGE_TEMPLATES = [
  { value: 'none',               label: '— None —' },
  { value: 'standard_admin',     label: 'Standard Admin' },
  { value: 'operations_admin',   label: 'Operations Admin' },
  { value: 'finance_admin',      label: 'Finance Admin' },
  { value: 'technician_default', label: 'Technician Default' },
  { value: 'custom',             label: 'Custom' },
];

const PRIVILEGE_LABELS: Record<string, string> = {
  users_view:       'View Users',
  users_manage:     'Manage Users',
  stations_view:    'View Stations',
  stations_manage:  'Manage Stations',
  sessions_view:    'View Sessions',
  sessions_control: 'Control Sessions',
  tickets_view:     'View Tickets',
  tickets_manage:   'Manage Tickets',
  billing_view:     'View Billing',
  billing_manage:   'Manage Billing',
  reports_view:     'View Reports',
  reports_export:   'Export Reports',
  settings_manage:  'Manage Settings',
};

// Privilege mappings sourced from Monta, AMPECO, and Azure MCA billing role research.
// Key principle: hard wall between financial data (finance_admin) and operational data (operations_admin/technician).
const TEMPLATE_PRIVILEGE_MAP: Record<string, string[]> = {
  // Full access — same as account owner. Keep headcount to 1–3 per organisation.
  standard_admin: [
    'users_view', 'users_manage',
    'stations_view', 'stations_manage',
    'sessions_view', 'sessions_control',
    'tickets_view', 'tickets_manage',
    'billing_view', 'billing_manage',
    'reports_view', 'reports_export',
    'settings_manage',
  ],
  // Manages infrastructure and sessions. Read-only on users (for session correlation).
  // No billing access — mirrors Monta Operations Manager model.
  operations_admin: [
    'users_view',
    'stations_view', 'stations_manage',
    'sessions_view', 'sessions_control',
    'tickets_view', 'tickets_manage',
    'reports_view', 'reports_export',
  ],
  // Billing and reconciliation only. Read-only on users/stations/sessions for dispute resolution.
  // No operational write access — mirrors Monta Bookkeeper / Azure Billing Reader.
  finance_admin: [
    'users_view',
    'stations_view',
    'sessions_view',
    'billing_view', 'billing_manage',
    'reports_view', 'reports_export',
  ],
  // Field technician. Scoped to charge points and maintenance tickets only.
  // No billing, no user data, no reports — AMPECO I&M model + GDPR data minimisation.
  technician_default: [
    'stations_view', 'stations_manage',
    'sessions_view', 'sessions_control',
    'tickets_view', 'tickets_manage',
  ],
};

function CustomPrivilegeSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (key: string) => {
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );
  };

  return (
    <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5 text-indigo-400" />
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
            Custom privileges ({selected.length} selected)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(Object.keys(PRIVILEGE_LABELS))}
            className="text-xs text-indigo-500 hover:text-indigo-700 underline"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            None
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {Object.entries(PRIVILEGE_LABELS).map(([key, label]) => {
          const checked = selected.includes(key);
          return (
            <label
              key={key}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                checked
                  ? 'bg-indigo-100 border border-indigo-300 text-indigo-800'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggle(key)}
              />
              <span
                className={`flex-shrink-0 w-3.5 h-3.5 rounded flex items-center justify-center border ${
                  checked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'
                }`}
              >
                {checked && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
              {label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PrivilegePreview({ template }: { template: string }) {
  if (template === 'none' || template === 'custom') return null;

  const privs = TEMPLATE_PRIVILEGE_MAP[template] ?? [];
  if (privs.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Included privileges ({privs.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {privs.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700"
          >
            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            {PRIVILEGE_LABELS[p] ?? p}
          </span>
        ))}
      </div>
    </div>
  );
}

const roleIcons: Record<UserRole, typeof ShieldCheck> = {
  super_admin:  ShieldCheck,
  tenant_admin: UserCog,
  technician:   Wrench,
};

export default function Users() {
  const { currentUser } = useTenant();

  const [users, setUsers]             = useState<ApiUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Manage drawer
  const [drawerOpen, setDrawerOpen]               = useState(false);
  const [selectedUserId, setSelectedUserId]       = useState<string | null>(null);
  const [role, setRole]                           = useState<UserRole>('tenant_admin');
  const [status, setStatus]                       = useState<'active' | 'suspended'>('active');
  const [tenantId, setTenantId]                   = useState<'sonelgaz' | 'saeig'>('sonelgaz');
  const [privilege, setPrivilege]                 = useState<string>('none');
  const [customPrivileges, setCustomPrivileges]   = useState<string[]>([]);
  const [saving, setSaving]                       = useState(false);

  // Create drawer
  const [createOpen, setCreateOpen]                   = useState(false);
  const [newName, setNewName]                         = useState('');
  const [newEmail, setNewEmail]                       = useState('');
  const [newPassword, setNewPassword]                 = useState('');
  const [newRole, setNewRole]                         = useState<'tenant_admin' | 'technician'>('tenant_admin');
  const [newTenant, setNewTenant]                     = useState<'sonelgaz' | 'saeig'>('sonelgaz');
  const [newPrivilege, setNewPrivilege]               = useState<string>('none');
  const [newCustomPrivileges, setNewCustomPrivileges] = useState<string[]>([]);
  const [creating, setCreating]                       = useState(false);

  const tenantScope = currentUser?.role === 'super_admin' ? undefined : currentUser?.tenantId;
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const list = await usersApi.list(tenantScope, controller.signal);
      if (!controller.signal.aborted) setUsers(list);
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      toast.error(getErrorMessage(err, 'Failed to load users'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [tenantScope]);

  useEffect(() => {
    void refresh();
    return () => { abortRef.current?.abort(); };
  }, [refresh]);

  const filteredUsers = users.filter((user) => {
    if (roleFilter   !== 'all' && user.role   !== roleFilter)   return false;
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    if (
      searchValue &&
      !user.name.toLowerCase().includes(searchValue.toLowerCase()) &&
      !user.email.toLowerCase().includes(searchValue.toLowerCase())
    ) return false;
    return true;
  });

  const openManage = (user: ApiUser) => {
    setSelectedUserId(user.id);
    setRole(user.role);
    setStatus(user.status);
    setTenantId(user.tenantId);
    setPrivilege(user.privilegeTemplate ?? 'none');
    setCustomPrivileges(user.customPrivileges ?? []);
    setDrawerOpen(true);
  };

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId) ?? null
    : null;

  const handleManageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    try {
      await usersApi.update(selectedUser.id, {
        role,
        status,
        privilege_template: privilege === 'none' ? null : privilege,
        custom_privileges: privilege === 'custom' ? customPrivileges : null,
        ...(currentUser?.role === 'super_admin' ? { tenant_id: tenantId } : {}),
      });
      toast.success(`Updated ${selectedUser.name}`);
      setDrawerOpen(false);
      void refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to update user'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newEmail.trim().toLowerCase();
    const trimmedName  = newName.trim();
    if (!trimmedEmail || !trimmedName || !newPassword) return;
    setCreating(true);
    try {
      await usersApi.create({
        email:              trimmedEmail,
        password:           newPassword,
        full_name:          trimmedName,
        role:               newRole,
        privilege_template: newPrivilege === 'none' ? null : newPrivilege,
        custom_privileges:  newPrivilege === 'custom' ? newCustomPrivileges : null,
        ...(currentUser?.role === 'super_admin' ? { tenant_id: newTenant } : {}),
      });
      toast.success('User created');
      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('tenant_admin');
      setNewPrivilege('none');
      setNewCustomPrivileges([]);
      void refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to create user'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Create admin accounts, change roles and tenant assignments"
        actions={
          <>
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" onClick={() => {
              if (filteredUsers.length === 0) { toast.error('No users to export'); return; }
              const rows = filteredUsers.map((u) => ({
                id: u.id, name: u.name, email: u.email,
                role: u.role, tenant: u.tenantId, status: u.status,
                created: u.createdAt ?? '',
              }));
              exportToCsv(rows, `users_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`, 'users', currentUser?.name ?? 'admin');
              toast.success(`Exported ${rows.length} users`);
            }}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button
              onClick={() => {
                setNewName(''); setNewEmail(''); setNewPassword('');
                setNewRole('tenant_admin');
                setNewPrivilege('none');
                setNewTenant(currentUser?.tenantId === 'saeig' ? 'saeig' : 'sonelgaz');
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Create User
            </Button>
          </>
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search by name or email..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={[
            {
              label: 'Role',
              value: roleFilter,
              options: [
                { label: 'Super Admin',  value: 'super_admin' },
                { label: 'Tenant Admin', value: 'tenant_admin' },
                { label: 'Technician',   value: 'technician' },
              ],
              onChange: setRoleFilter,
            },
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'Active',    value: 'active' },
                { label: 'Suspended', value: 'suspended' },
              ],
              onChange: setStatusFilter,
            },
          ]}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Privilege</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton cols={6} />
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      icon={UsersIcon}
                      title="No users found"
                      description="Try adjusting your search or role filter."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const RoleIcon = roleIcons[user.role];
                  return (
                    <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{roleLabels[user.role]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.privilegeTemplate ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {PRIVILEGE_TEMPLATES.find(p => p.value === user.privilegeTemplate)?.label ?? user.privilegeTemplate}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            user.status === 'active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {user.tenantId === 'sonelgaz' ? 'Sonelgaz' : 'SAEIG'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openManage(user)}>
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Manage drawer */}
      <SideDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selectedUser ? `Manage ${selectedUser.name}` : 'Manage User'}
        description={selectedUser?.email ?? ''}
      >
        {selectedUser && (
          <form className="space-y-4" onSubmit={handleManageSubmit}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={selectedUser.name} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={selectedUser.email} disabled />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currentUser?.role === 'super_admin' && (
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    )}
                    <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'suspended')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select
                value={tenantId}
                onValueChange={(v) => setTenantId(v as 'sonelgaz' | 'saeig')}
                disabled={currentUser?.role !== 'super_admin'}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sonelgaz">Sonelgaz</SelectItem>
                  <SelectItem value="saeig">SAEIG</SelectItem>
                </SelectContent>
              </Select>
              {currentUser?.role !== 'super_admin' && (
                <p className="text-xs text-gray-500">Only a super admin can move users between tenants.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Privilege Template</Label>
              <Select value={privilege} onValueChange={(v) => { setPrivilege(v); if (v !== 'custom') setCustomPrivileges([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIVILEGE_TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {privilege === 'custom' ? (
                <CustomPrivilegeSelector selected={customPrivileges} onChange={setCustomPrivileges} />
              ) : (
                <PrivilegePreview template={privilege} />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        )}
      </SideDrawer>

      {/* Create drawer */}
      <SideDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Account"
        description="Provision a new tenant admin or technician"
      >
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ahmed Benali"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="ahmed@sonelgaz.dz"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'tenant_admin' | 'technician')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select
                value={newTenant}
                onValueChange={(v) => setNewTenant(v as 'sonelgaz' | 'saeig')}
                disabled={currentUser?.role !== 'super_admin'}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sonelgaz">Sonelgaz</SelectItem>
                  <SelectItem value="saeig">SAEIG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Privilege Template</Label>
            <Select value={newPrivilege} onValueChange={(v) => { setNewPrivilege(v); if (v !== 'custom') setNewCustomPrivileges([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIVILEGE_TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {newPrivilege === 'custom' ? (
              <CustomPrivilegeSelector selected={newCustomPrivileges} onChange={setNewCustomPrivileges} />
            ) : (
              <PrivilegePreview template={newPrivilege} />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create Account'}</Button>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
