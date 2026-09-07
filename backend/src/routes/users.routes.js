import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

/**
 * GET /api/users/me
 * Fetch profile for the currently logged-in user
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: profile, error } = await req.supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found.',
      });
    }

    return res.json({
      success: true,
      profile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/me
 * Update current user profile
 */
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const updates = updateProfileSchema.parse(req.body);

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (updates.fullName !== undefined) updatePayload.full_name = updates.fullName;
    if (updates.phone !== undefined) updatePayload.phone = updates.phone;
    if (updates.avatarUrl !== undefined) updatePayload.avatar_url = updates.avatarUrl;

    const { data, error } = await req.supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:id
 * Retrieve profile by ID
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await req.supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, created_at')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    return res.json({
      success: true,
      profile: data,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
