import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/auth/google/url
 * Returns the OAuth URL to initiate Google Sign-In via Supabase
 */
router.get('/google/url', async (req, res, next) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const redirectTo = req.query.redirectTo || `${clientUrl}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      url: data.url,
      provider: 'google',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/session
 * Returns authenticated user details and profile from public.profiles
 */
router.get('/session', requireAuth, async (req, res, next) => {
  try {
    const { data: profile, error } = await req.supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        phone: req.user.phone,
        confirmed_at: req.user.confirmed_at,
        last_sign_in_at: req.user.last_sign_in_at,
        app_metadata: req.user.app_metadata,
        user_metadata: req.user.user_metadata,
      },
      profile: profile || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/signout
 * Signs out the current session
 */
router.post('/signout', requireAuth, async (req, res, next) => {
  try {
    const { error } = await req.supabase.auth.signOut();
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, message: 'Successfully signed out.' });
  } catch (err) {
    next(err);
  }
});

export default router;
