import { useEffect, useState } from 'react';
import { Plus, ShieldCheck, Wrench, UserCog } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { Button } from '../components/ui/button';
import { SideDrawer } from '../components/dashboard/SideDrawer';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { TableSkeleton } from '../components/dashboard/LoadingState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { loadUsers, saveUsers } from '../data/userStore';
import {
  User,
  UserPrivilege,
  UserPrivilegeTemplate,
  UserRole,
} from '../types';
import { toast } from 'sonner';

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  tenant_admin: 'Tenant Admin',
  technician: 'Technician',
};

const roleIcons: Record<UserRole, typeof ShieldCheck> = {
  super_admin: ShieldCheck,
  tenant_admin: UserCog,
  technician: Wrench,
};

type TenantAdminTemplate = 'standard_admin' | 'operations_admin' | 'finance_admin';

const tenantAdminPrivilegeTemplates: Record<
  TenantAdminTemplate,
  { label: string; description: string; privileges: UserPrivilege[] }
> = {
  standard_admin: {
    label: 'Standard Tenant Admin',
    description: 'Balanced access for day-to-day tenant administration tasks.',
    privileges: [
      'users_view',
      'stations_view',
      'sessions_view',
      'tickets_view',
      'tickets_manage',
      'reports_view',
    ],
  },
  operations_admin: {
    label: 'Operations Admin',
    description: 'Operational control over stations, sessions, and incidents.',
    privileges: [
      'users_view',
      'stations_view',
      'stations_manage',
      'sessions_view',
      'sessions_control',
      'tickets_view',
      'tickets_manage',
      'reports_view',
      'reports_export',
    ],
  },
  finance_admin: {
    label: 'Finance Admin',
    description: 'Revenue, billing, and exports with limited operational powers.',
    privileges: [
      'users_view',
      'sessions_view',
      'tickets_view',
      'billing_view',
      'billing_manage',
      'reports_view',
      'reports_export',
    ],
  },
};

const technicianDefaultPrivileges: UserPrivilege[] = [
  'stations_view',
  'sessions_view',
  'tickets_view',
  'tickets_manage',
];

const privilegeGroups: Array<{
  title: string;
  items: Array<{ key: UserPrivilege; label: string; description: string }>;
}> = [
  {
    title: 'Users',
    items: [
      {
        key: 'users_view',
        label: 'View users',
        description: 'Can view tenant users and role assignments.',
      },
      {
        key: 'users_manage',
        label: 'Manage users',
        description: 'Can create, edit, and suspend tenant users.',
      },
    ],
  },
  {
    title: 'Stations & Sessions',
    items: [
      {
        key: 'stations_view',
        label: 'View stations',
        description: 'Can monitor station information and status.',
      },
      {
        key: 'stations_manage',
        label: 'Manage stations',
        description: 'Can edit station settings and configurations.',
      },
      {
        key: 'sessions_view',
        label: 'View sessions',
        description: 'Can view live and historical charging sessions.',
      },
      {
        key: 'sessions_control',
        label: 'Control sessions',
        description: 'Can stop or intervene in active sessions.',
      },
    ],
  },
  {
    title: 'Tickets & Reports',
    items: [
      {
        key: 'tickets_view',
        label: 'View tickets',
        description: 'Can access incident and maintenance tasks.',
      },
      {
        key: 'tickets_manage',
        label: 'Manage tickets',
        description: 'Can create, assign, and close tickets.',
      },
      {
        key: 'reports_view',
        label: 'View reports',
        description: 'Can access KPI, activity, and performance reports.',
      },
      {
        key: 'reports_export',
        label: 'Export reports',
        description: 'Can export report data files.',
      },
    ],
  },
  {
    title: 'Billing & Settings',
    items: [
      {
        key: 'billing_view',
        label: 'View billing',
        description: 'Can view invoices and payment summaries.',
      },
      {
        key: 'billing_manage',
        label: 'Manage billing',
        description: 'Can perform billing adjustments and refunds.',
      },
      {
        key: 'settings_manage',
        label: 'Manage settings',
        description: 'Can update tenant-level platform settings.',
      },
    ],
  },
];

export default function Users() {
  const { currentTenant } = useTenant();
  const [searchValue, setSearchValue] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('tenant_admin');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [tenantId, setTenantId] = useState<'sonelgaz' | 'saeig'>('sonelgaz');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('tenant_admin');
  const [newTenant, setNewTenant] = useState<'sonelgaz' | 'saeig'>('sonelgaz');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended'>('active');
  const [newPrivilegeTemplate, setNewPrivilegeTemplate] = useState<
    TenantAdminTemplate | 'custom'
  >('standard_admin');
  const [newPrivileges, setNewPrivileges] = useState<UserPrivilege[]>(
    tenantAdminPrivilegeTemplates.standard_admin.privileges
  );
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1300);
    return () => clearTimeout(t);
  }, []);

  const filteredUsers = users.filter((user) => {
    if (currentTenant && user.tenantId !== currentTenant.id) return false;
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    if (
      searchValue &&
      !user.name.toLowerCase().includes(searchValue.toLowerCase()) &&
      !user.email.toLowerCase().includes(searchValue.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const openManage = (userId: string) => {
    const user = users.find((item) => item.id === userId);
    if (!user) return;
    setSelectedUserId(userId);
    setRole(user.role);
    setStatus(user.status || 'active');
    setTenantId(user.tenantId);
    setDrawerOpen(true);
  };

  const selectedUser = selectedUserId
    ? users.find((user) => user.id === selectedUserId)
    : null;

  useEffect(() => {
    if (newRole === 'technician') {
      setNewPrivilegeTemplate('custom');
      setNewPrivileges(technicianDefaultPrivileges);
    }
  }, [newRole]);

  const handlePrivilegeTemplateChange = (value: TenantAdminTemplate | 'custom') => {
    setNewPrivilegeTemplate(value);
    if (value !== 'custom') {
      setNewPrivileges(tenantAdminPrivilegeTemplates[value].privileges);
    }
  };

  const togglePrivilege = (privilege: UserPrivilege, isEnabled: boolean) => {
    setNewPrivilegeTemplate('custom');
    setNewPrivileges((prev) => {
      if (isEnabled) {
        return Array.from(new Set([...prev, privilege]));
      }
      return prev.filter((item) => item !== privilege);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">User Management</h1>
          <p className="text-gray-500 mt-1">Create admin accounts and assign roles and privileges</p>
        </div>
        <Button
          onClick={() => {
            setNewName('');
            setNewEmail('');
            setNewRole('tenant_admin');
            setNewTenant(currentTenant?.id || 'sonelgaz');
            setNewStatus('active');
            setNewPrivilegeTemplate('standard_admin');
            setNewPrivileges(tenantAdminPrivilegeTemplates.standard_admin.privileges);
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Admin
        </Button>
      </div>

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
                { label: 'Super Admin', value: 'super_admin' },
                { label: 'Tenant Admin', value: 'tenant_admin' },
                { label: 'Technician', value: 'technician' },
              ],
              onChange: setRoleFilter,
            },
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'Active', value: 'active' },
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
                <TableHead>Status</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton cols={5} />
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No users found
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
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            user.status === 'active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {user.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {user.tenantId === 'sonelgaz' ? 'Sonelgaz' : 'SAEIG'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openManage(user.id)}
                        >
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

      <SideDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selectedUser ? `Manage ${selectedUser.name}` : 'Manage User'}
        description={selectedUser?.email}
      >
        {selectedUser && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setUsers((prev) => {
                const next = prev.map((user) =>
                  user.id === selectedUser.id
                    ? { ...user, role, status, tenantId }
                    : user
                );
                saveUsers(next);
                return next;
              });
              toast.success('User privileges updated');
              setDrawerOpen(false);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="manage-name">Name</Label>
              <Input id="manage-name" value={selectedUser.name} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manage-email">Email</Label>
              <Input id="manage-email" value={selectedUser.email} disabled />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manage-role">Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                  <SelectTrigger id="manage-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manage-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as 'active' | 'suspended')}
                >
                  <SelectTrigger id="manage-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manage-tenant">Tenant</Label>
              <Select
                value={tenantId}
                onValueChange={(value) => setTenantId(value as 'sonelgaz' | 'saeig')}
              >
                <SelectTrigger id="manage-tenant">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sonelgaz">Sonelgaz</SelectItem>
                  <SelectItem value="saeig">SAEIG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </SideDrawer>

      <SideDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Admin Account"
        description="Provision a new tenant admin or technician"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmedEmail = newEmail.trim().toLowerCase();
            const trimmedName = newName.trim();
            if (!trimmedEmail || !trimmedName) return;
            const emailExists = users.some(
              (user) => user.email.toLowerCase() === trimmedEmail
            );
            if (emailExists) {
              toast.error('A user with this email already exists');
              return;
            }
            const assignedPrivileges =
              newRole === 'technician' ? technicianDefaultPrivileges : newPrivileges;
            const assignedTemplate: UserPrivilegeTemplate =
              newRole === 'technician' ? 'technician_default' : newPrivilegeTemplate;
            if (newRole === 'tenant_admin' && assignedPrivileges.length === 0) {
              toast.error('Select at least one privilege for this tenant admin');
              return;
            }
            const newUser: User = {
              id: `USR-${Date.now().toString().slice(-6)}`,
              email: trimmedEmail,
              name: trimmedName,
              role: newRole,
              tenantId: newTenant,
              status: newStatus,
              privileges: assignedPrivileges,
              privilegeTemplate: assignedTemplate,
            };
            setUsers((prev) => {
              const next = [...prev, newUser];
              saveUsers(next);
              return next;
            });
            toast.success('New admin account created');
            setCreateOpen(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="create-name">Full Name</Label>
            <Input
              id="create-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Ahmed Benali"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="ahmed@sonelgaz.dz"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                <SelectTrigger id="create-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-status">Status</Label>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as 'active' | 'suspended')}
              >
                <SelectTrigger id="create-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-tenant">Tenant</Label>
            <Select
              value={newTenant}
              onValueChange={(value) => setNewTenant(value as 'sonelgaz' | 'saeig')}
            >
              <SelectTrigger id="create-tenant">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sonelgaz">Sonelgaz</SelectItem>
                <SelectItem value="saeig">SAEIG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {newRole === 'tenant_admin' ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="space-y-1">
                <Label htmlFor="create-privilege-template">Privilege Template</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Start from a template, then customize if needed.
                </p>
              </div>
              <Select
                value={newPrivilegeTemplate}
                onValueChange={(value) =>
                  handlePrivilegeTemplateChange(value as TenantAdminTemplate | 'custom')
                }
              >
                <SelectTrigger id="create-privilege-template">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard_admin">Standard Tenant Admin</SelectItem>
                  <SelectItem value="operations_admin">Operations Admin</SelectItem>
                  <SelectItem value="finance_admin">Finance Admin</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {newPrivilegeTemplate !== 'custom' && (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {tenantAdminPrivilegeTemplates[newPrivilegeTemplate].description}
                </p>
              )}
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {newPrivileges.length} privileges selected
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {privilegeGroups.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-lg border border-slate-200 bg-background p-3 dark:border-slate-700"
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {group.title}
                    </p>
                    <div className="mt-2 space-y-2">
                      {group.items.map((item) => {
                        const checkboxId = `create-privilege-${item.key}`;
                        return (
                          <label
                            key={item.key}
                            htmlFor={checkboxId}
                            className="flex cursor-pointer items-start gap-2 rounded-md p-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={newPrivileges.includes(item.key)}
                              onCheckedChange={(checked) =>
                                togglePrivilege(item.key, checked === true)
                              }
                              className="mt-0.5"
                            />
                            <span className="space-y-0.5">
                              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                                {item.label}
                              </span>
                              <span className="block text-xs text-slate-500 dark:text-slate-400">
                                {item.description}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/60 dark:bg-blue-950/35">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Technician accounts use default field privileges for stations, sessions, and
                tickets.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Account</Button>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
