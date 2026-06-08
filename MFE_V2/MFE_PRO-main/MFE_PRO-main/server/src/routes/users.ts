import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const VALID_PRIVILEGES = [
  'users_view', 'users_manage',
  'stations_view', 'stations_manage',
  'sessions_view', 'sessions_control',
  'tickets_view', 'tickets_manage',
  'billing_view', 'billing_manage',
  'reports_view', 'reports_export',
  'settings_manage',
] as const;

const CustomPrivilegesSchema = z.array(z.enum(VALID_PRIVILEGES)).optional().nullable();

const UserCreateSchema = z.object({
  email:              z.string().email().max(120),
  password:           z.string().min(6).max(100),
  full_name:          z.string().min(1).max(120),
  role:               z.enum(['super_admin', 'tenant_admin', 'technician']),
  tenant_id:          z.string().optional(),
  privilege_template: z.string().max(60).optional(),
  custom_privileges:  CustomPrivilegesSchema,
});

const UserUpdateSchema = z.object({
  full_name:          z.string().min(1).max(120).optional(),
  role:               z.enum(['super_admin', 'tenant_admin', 'technician']).optional(),
  // Must match the `users.status` ENUM in MySQL.
  status:             z.enum(['active', 'suspended']).optional(),
  tenant_id:          z.string().optional(),
  privilege_template: z.string().max(60).optional(),
  custom_privileges:  CustomPrivilegesSchema,
});

// GET /users?tenantId=&page=1&limit=50
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    const limit  = Math.min(parseInt(req.query.limit  as string) || 50, 200);
    const page   = Math.max(parseInt(req.query.page   as string) || 1,  1);
    const offset = (page - 1) * limit;

    let q = 'SELECT user_id AS id, tenant_id AS tenantId, email, full_name AS name, role, status, privilege_template AS privilegeTemplate, custom_privileges AS customPrivileges, created_at AS createdAt FROM users';
    const p: any[] = [];
    if (tenantId) { q += ' WHERE tenant_id = ?'; p.push(tenantId); }
    q += ' ORDER BY full_name LIMIT ? OFFSET ?';
    p.push(limit, offset);

    const [rows] = await pool.query(q, p);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /users
router.post('/', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const parsed = UserCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message }); return;
    }
    const { email, password, full_name, role, tenant_id, privilege_template, custom_privileges } = parsed.data;
    const targetTenantId = req.user!.role === 'super_admin' ? tenant_id : req.user!.tenantId;
    if (!targetTenantId) {
      res.status(400).json({ error: 'tenant_id is required' }); return;
    }
    const user_id = uuidv4();
    const password_hash = await bcrypt.hash(password, 12);
    const customPrivJson = privilege_template === 'custom' && custom_privileges?.length
      ? JSON.stringify(custom_privileges)
      : null;
    await pool.query(
      'INSERT INTO users (user_id, tenant_id, email, password_hash, full_name, role, privilege_template, custom_privileges) VALUES (?,?,?,?,?,?,?,?)',
      [user_id, targetTenantId, email, password_hash, full_name, role, privilege_template || null, customPrivJson]
    );
    res.status(201).json({ id: user_id });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') { res.status(409).json({ error: 'Email already in use' }); return; }
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /users/:id
router.patch('/:id', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const parsed = UserUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message }); return;
    }
    const { full_name, role, status, tenant_id, privilege_template, custom_privileges } = parsed.data;
    // Only super_admin can move a user between tenants.
    const effectiveTenantId =
      req.user!.role === 'super_admin' ? tenant_id || null : null;

    const sets: string[] = [];
    const params: any[] = [];

    if (full_name)          { sets.push('full_name = ?');          params.push(full_name); }
    if (role)               { sets.push('role = ?');               params.push(role); }
    if (status)             { sets.push('status = ?');             params.push(status); }
    if (effectiveTenantId)  { sets.push('tenant_id = ?');          params.push(effectiveTenantId); }
    if (privilege_template !== undefined) {
      sets.push('privilege_template = ?');
      params.push(privilege_template || null);
      // Always sync custom_privileges when template changes
      const customPrivJson = privilege_template === 'custom' && custom_privileges?.length
        ? JSON.stringify(custom_privileges)
        : null;
      sets.push('custom_privileges = ?');
      params.push(customPrivJson);
    }

    if (sets.length === 0) { res.json({ success: true }); return; }

    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE user_id = ?`, params);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
