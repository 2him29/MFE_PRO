import { useState } from 'react';
import { Plus, ShieldCheck, Wrench, UserCog } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { Button } from '../components/ui/button';
import { SideDrawer } from '../components/dashboard/SideDrawer';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
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
import { mockUsers } from '../data/mockData';
import { UserRole } from '../types';
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

  const filteredUsers = mockUsers.filter((user) => {
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
    const user = mockUsers.find((item) => item.id === userId);
    if (!user) return;
    setSelectedUserId(userId);
    setRole(user.role);
    setStatus(user.status || 'active');
    setTenantId(user.tenantId);
    setDrawerOpen(true);
  };

  const selectedUser = selectedUserId
    ? mockUsers.find((user) => user.id === selectedUserId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">User Management</h1>
          <p className="text-gray-500 mt-1">Create admin accounts and assign roles</p>
        </div>
        <Button
          onClick={() => {
            setNewName('');
            setNewEmail('');
            setNewRole('tenant_admin');
            setNewTenant(currentTenant?.id || 'sonelgaz');
            setNewStatus('active');
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
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const RoleIcon = roleIcons[user.role];
                  return (
                    <TableRow key={user.id} className="hover:bg-gray-50">
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
                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                              : 'border-amber-200 text-amber-700 bg-amber-50'
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
