import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import pool from '../db';
import { requireAuth } from '../middleware/auth';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: { error: 'Too many OTP requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// ── In-memory OTP store (demo-safe: server-side only) ─────────────────────────
const OTP_TTL_MS      = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 3;

interface OtpEntry { code: string; expiresAt: number; attempts: number; }
const otpStore = new Map<string, OtpEntry>();

// POST /auth/otp/request
router.post('/otp/request', otpLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'email required' }); return; }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  // In demo mode we return the code so the UI can display it.
  // In a real deployment remove demoCode and send an email instead.
  res.json({ demoCode: code });
});

// POST /auth/otp/verify
router.post('/otp/verify', async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) { res.status(400).json({ error: 'email and code required' }); return; }
  const entry = otpStore.get(email);
  if (!entry || Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    res.json({ valid: false, reason: 'expired' }); return;
  }
  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    res.json({ valid: false, reason: 'locked' }); return;
  }
  entry.attempts++;
  if (entry.code !== String(code)) {
    if (entry.attempts >= MAX_OTP_ATTEMPTS) {
      res.json({ valid: false, reason: 'locked' }); return;
    }
    res.json({ valid: false, reason: 'invalid' }); return;
  }
  otpStore.delete(email);
  res.json({ valid: true });
});

// POST /auth/login
// Accepts { email, password } and optionally { tenantId }. When tenantId is
// omitted we look up the user by email alone — emails are unique across
// tenants in this dataset, so this gives a friction-free dashboard login.
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { email, password, tenantId } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }
  try {
    const [rows]: any = tenantId
      ? await pool.query(
          'SELECT * FROM users WHERE email = ? AND tenant_id = ? AND status = "active" LIMIT 1',
          [email, tenantId]
        )
      : await pool.query(
          'SELECT * FROM users WHERE email = ? AND status = "active" LIMIT 1',
          [email]
        );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign(
      { userId: user.user_id, tenantId: user.tenant_id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );
    res.json({
      token,
      user: {
        id:       user.user_id,
        email:    user.email,
        name:     user.full_name,
        role:     user.role,
        tenantId: user.tenant_id,
        status:   user.status,
      },
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT user_id, tenant_id, email, full_name, role, status FROM users WHERE user_id = ? LIMIT 1',
      [req.user!.userId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    const u = rows[0];
    res.json({ id: u.user_id, email: u.email, name: u.full_name, role: u.role, tenantId: u.tenant_id, status: u.status });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
