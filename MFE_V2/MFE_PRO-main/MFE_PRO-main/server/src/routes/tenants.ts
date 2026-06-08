import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /tenants
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const isSA = req.user!.role === 'super_admin';
    const [rows] = isSA
      ? await pool.query('SELECT * FROM tenants ORDER BY name')
      : await pool.query('SELECT * FROM tenants WHERE tenant_id = ?', [req.user!.tenantId]);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /tenants  (super_admin only)
router.post('/', requireAuth, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { tenant_id, name, logo, accent_color, accent_color_dark } = req.body;
    if (!tenant_id || !name) { res.status(400).json({ error: 'tenant_id and name required' }); return; }
    await pool.query(
      'INSERT INTO tenants (tenant_id, name, logo, accent_color, accent_color_dark) VALUES (?,?,?,?,?)',
      [tenant_id, name, logo || null, accent_color || null, accent_color_dark || null]
    );
    res.status(201).json({ tenant_id });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') { res.status(409).json({ error: 'Tenant ID already exists' }); return; }
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
