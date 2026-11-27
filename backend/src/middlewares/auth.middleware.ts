import type { RequestHandler } from 'express';
import { createSupabaseUserClient, supabaseAdmin } from '../config/supabase';

export const authMiddleware: RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    res.status(401).json({ error: 'Authorization bearer token is required' });
    return;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error('Auth error:', error?.message);
    res.status(401).json({ error: 'Invalid or expired authentication token' });
    return;
  }

  req.user = user;
  req.supabase = createSupabaseUserClient(token);
  next();
};

export const authenticateUser = authMiddleware;
