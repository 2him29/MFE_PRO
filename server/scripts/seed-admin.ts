/**
 * Run once after importing the SQL schema:
 *   npm run seed
 *
 * Creates the two tenants, one super_admin account, and demo tenant staff.
 * Change these passwords before running in production.
 */
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../src/db';

const ADMIN_EMAIL = 'admin@evcharge.dz';
const ADMIN_PASSWORD = 'Admin@1234';
const STAFF_PASSWORD = 'User@1234';

const staffUsers = [
  {
    id: 'USR-002',
    tenantId: 'sonelgaz',
    email: 'ahmed.benali@sonelgaz.dz',
    fullName: 'Ahmed Benali',
    role: 'tenant_admin',
    privilegeTemplate: 'operations_manager',
  },
  {
    id: 'USR-003',
    tenantId: 'sonelgaz',
    email: 'yasmine.hadj@sonelgaz.dz',
    fullName: 'Yasmine Hadj',
    role: 'technician',
    privilegeTemplate: 'technician_default',
  },
  {
    id: 'USR-004',
    tenantId: 'saeig',
    email: 'karim.messaoudi@saeig.dz',
    fullName: 'Karim Messaoudi',
    role: 'tenant_admin',
    privilegeTemplate: 'operations_manager',
  },
  {
    id: 'USR-005',
    tenantId: 'saeig',
    email: 'sofiane.bensaid@saeig.dz',
    fullName: 'Sofiane Bensaid',
    role: 'technician',
    privilegeTemplate: 'technician_default',
  },
] as const;

const adminPrivileges = [
  'view_dashboard',
  'manage_stations',
  'manage_connectors',
  'view_sessions',
  'manage_tickets',
  'assign_tickets',
  'view_billing',
  'manage_billing',
  'view_alerts',
  'manage_users',
];

const superAdminPrivileges = [...adminPrivileges, 'manage_tenants'];

const technicianPrivileges = [
  'view_dashboard',
  'view_sessions',
  'manage_tickets',
  'view_alerts',
];

async function grantPrivileges(userId: string, privileges: readonly string[]) {
  for (const privilege of privileges) {
    await pool.query(
      `INSERT IGNORE INTO user_privileges (user_id, privilege_key)
       VALUES (?, ?)`,
      [userId, privilege]
    );
  }
}

async function getUserIdByEmail(email: string) {
  const [rows]: any = await pool.query(
    'SELECT user_id FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0]?.user_id as string | undefined;
}

async function seed() {
  await pool.query(`
    INSERT IGNORE INTO privileges (privilege_key, label) VALUES
      ('view_dashboard',    'View Dashboard'),
      ('manage_stations',   'Manage Stations'),
      ('manage_connectors', 'Manage Connectors'),
      ('view_sessions',     'View Charging Sessions'),
      ('manage_tickets',    'Manage Tickets'),
      ('assign_tickets',    'Assign Tickets'),
      ('view_billing',      'View Billing Records'),
      ('manage_billing',    'Manage Billing Records'),
      ('view_alerts',       'View Alerts'),
      ('manage_users',      'Manage Users'),
      ('manage_tenants',    'Manage Tenants')
  `);
  console.log('Privileges seeded');

  await pool.query(`
    INSERT IGNORE INTO tenants (tenant_id, name, accent_color, accent_color_dark) VALUES
      ('sonelgaz', 'Sonelgaz', '#f97316', '#ea580c'),
      ('saeig',    'SAEIG',    '#2563eb', '#1d4ed8')
  `);
  console.log('Tenants seeded');

  const adminId = uuidv4();
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (user_id, tenant_id, email, password_hash, full_name, role, privilege_template)
     VALUES (?, 'sonelgaz', ?, ?, 'Super Admin', 'super_admin', 'full_access')
     ON DUPLICATE KEY UPDATE
       tenant_id = VALUES(tenant_id),
       password_hash = VALUES(password_hash),
       full_name = VALUES(full_name),
       role = VALUES(role),
       status = 'active',
       privilege_template = VALUES(privilege_template)`,
    [adminId, ADMIN_EMAIL, adminHash]
  );
  const savedAdminId = await getUserIdByEmail(ADMIN_EMAIL);
  if (!savedAdminId) throw new Error(`Could not find seeded admin ${ADMIN_EMAIL}`);
  await grantPrivileges(savedAdminId, superAdminPrivileges);
  console.log(`Super admin seeded: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  const staffHash = await bcrypt.hash(STAFF_PASSWORD, 12);
  for (const user of staffUsers) {
    await pool.query(
      `INSERT INTO users (user_id, tenant_id, email, password_hash, full_name, role, privilege_template)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tenant_id = VALUES(tenant_id),
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = VALUES(role),
         status = 'active',
         privilege_template = VALUES(privilege_template)`,
      [
        user.id,
        user.tenantId,
        user.email,
        staffHash,
        user.fullName,
        user.role,
        user.privilegeTemplate,
      ]
    );

    const savedUserId = await getUserIdByEmail(user.email);
    if (!savedUserId) throw new Error(`Could not find seeded user ${user.email}`);
    await grantPrivileges(
      savedUserId,
      user.role === 'tenant_admin' ? adminPrivileges : technicianPrivileges
    );
  }
  console.log(`Staff users seeded: ${staffUsers.length} users / ${STAFF_PASSWORD}`);

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
