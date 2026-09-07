import { supabase, createUserClient } from '../config/supabase.js';

/**
 * Middleware: Requires a valid Supabase JWT Bearer token
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or malformed Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication session.',
        details: error?.message,
      });
    }

    req.user = user;
    req.token = token;
    req.supabase = createUserClient(token);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Optionally parses Supabase JWT Bearer token if present
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        req.user = user;
        req.token = token;
        req.supabase = createUserClient(token);
      }
    }

    if (!req.supabase) {
      req.supabase = supabase;
    }

    next();
  } catch (err) {
    // Non-blocking: proceed as anonymous
    req.supabase = supabase;
    next();
  }
}
