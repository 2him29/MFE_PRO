import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const UserCreateSchema = z.object({
  email:              z.string().email().max(120),
  password:           z.string().min(6).max(100),
  full_name:          z.string().min(1).max(120),
  role:               z.enum(['super_admin', 'tenant_admin', 'technician']),
  tenant_id:          z.string().optional(),
  privilege_template: z.string().max(60).optional(),
});

const UserUpdateSchema = z.object({
  full_name:          z.string().min(1).max(120).optional(),
  role:               z.enum(['super_admin', 'tenant_admin', 'technician']).optional(),
  status:             z.enum(['active', 'inactive']).optional(),
  privilege_template: z.string().max(60).optional(),
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

    let q = 'SELECT user_id AS id, tenant_id AS tenantId, email, full_name AS name, role, status, privilege_template AS privilegeTemplate, created_at AS createdAt FROM users';
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
    const { email, password, full_name, role, tenant_id, privilege_template } = parsed.data;
    const targetTenantId = req.user!.role === 'super_admin' ? tenant_id : req.user!.tenantId;
    if (!targetTenantId) {
      res.status(400).json({ error: 'tenant_id is required' }); return;
    }
    const user_id = uuidv4();
    const password_hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (user_id, tenant_id, email, password_hash, full_name, role, privilege_template) VALUES (?,?,?,?,?,?,?)',
      [user_id, targetTenantId, email, password_hash, full_name, role, privilege_template || null]
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
    const { full_name, role, status, privilege_template } = parsed.data;
    await pool.query(
      `UPDATE users SET
        full_name          = COALESCE(?, full_name),
        role               = COALESCE(?, role),
        status             = COALESCE(?, status),
        privilege_template = COALESCE(?, privilege_template)
       WHERE user_id = ?`,
      [full_name || null, role || null, status || null, privilege_template || null, req.params.id]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
