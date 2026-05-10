"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Run once after importing the SQL schema:
 *   npm run seed
 *
 * Creates the two tenants, one super_admin account, and demo tenant staff.
 * Change these passwords before running in production.
 */
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../src/db"));
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
];
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
async function grantPrivileges(userId, privileges) {
    for (const privilege of privileges) {
        await db_1.default.query(`INSERT IGNORE INTO user_privileges (user_id, privilege_key)
       VALUES (?, ?)`, [userId, privilege]);
    }
}
async function getUserIdByEmail(email) {
    const [rows] = await db_1.default.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0]?.user_id;
}
async function seed() {
    await db_1.default.query(`
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
    await db_1.default.query(`
    INSERT IGNORE INTO tenants (tenant_id, name, accent_color, accent_color_dark) VALUES
      ('sonelgaz', 'Sonelgaz', '#f97316', '#ea580c'),
      ('saeig',    'SAEIG',    '#2563eb', '#1d4ed8')
  `);
    console.log('Tenants seeded');
    const adminId = (0, uuid_1.v4)();
    const adminHash = await bcryptjs_1.default.hash(ADMIN_PASSWORD, 12);
    await db_1.default.query(`INSERT INTO users (user_id, tenant_id, email, password_hash, full_name, role, privilege_template)
     VALUES (?, 'sonelgaz', ?, ?, 'Super Admin', 'super_admin', 'full_access')
     ON DUPLICATE KEY UPDATE
       tenant_id = VALUES(tenant_id),
       password_hash = VALUES(password_hash),
       full_name = VALUES(full_name),
       role = VALUES(role),
       status = 'active',
       privilege_template = VALUES(privilege_template)`, [adminId, ADMIN_EMAIL, adminHash]);
    const savedAdminId = await getUserIdByEmail(ADMIN_EMAIL);
    if (!savedAdminId)
        throw new Error(`Could not find seeded admin ${ADMIN_EMAIL}`);
    await grantPrivileges(savedAdminId, superAdminPrivileges);
    console.log(`Super admin seeded: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    const staffHash = await bcryptjs_1.default.hash(STAFF_PASSWORD, 12);
    for (const user of staffUsers) {
        await db_1.default.query(`INSERT INTO users (user_id, tenant_id, email, password_hash, full_name, role, privilege_template)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tenant_id = VALUES(tenant_id),
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = VALUES(role),
         status = 'active',
         privilege_template = VALUES(privilege_template)`, [
            user.id,
            user.tenantId,
            user.email,
            staffHash,
            user.fullName,
            user.role,
            user.privilegeTemplate,
        ]);
        const savedUserId = await getUserIdByEmail(user.email);
        if (!savedUserId)
            throw new Error(`Could not find seeded user ${user.email}`);
        await grantPrivileges(savedUserId, user.role === 'tenant_admin' ? adminPrivileges : technicianPrivileges);
    }
    console.log(`Staff users seeded: ${staffUsers.length} users / ${STAFF_PASSWORD}`);
    await db_1.default.end();
}
seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
