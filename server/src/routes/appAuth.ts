import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

const router = Router();

// POST /api/app/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, full_name, phone } = req.body;

  if (!email || !password || !full_name) {
    res.status(400).json({ error: 'email, password, and full_name are required' });
    return;
  }

  const [existing] = await pool.query<any[]>(
    'SELECT app_user_id FROM app_users WHERE email = ?',
    [email],
  );
  if ((existing as any[]).length > 0) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const appUserId = uuidv4();

  await pool.query(
    'INSERT INTO app_users (app_user_id, email, password_hash, full_name, phone) VALUES (?, ?, ?, ?, ?)',
    [appUserId, email, passwordHash, full_name, phone ?? null],
  );

  const token = jwt.sign(
    { appUserId, email },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
  );

  res.status(201).json({
    token,
    user: { appUserId, email, full_name, phone: phone ?? null },
  });
});

// POST /api/app/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const [rows] = await pool.query<any[]>(
    'SELECT app_user_id, email, password_hash, full_name, phone, status FROM app_users WHERE email = ?',
    [email],
  );
  const user = (rows as any[])[0];

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account suspended' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { appUserId: user.app_user_id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
  );

  res.json({
    token,
    user: {
      appUserId: user.app_user_id,
      email:     user.email,
      full_name: user.full_name,
      phone:     user.phone,
    },
  });
});

export default router;
