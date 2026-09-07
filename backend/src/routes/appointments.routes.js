import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = Router();

const appointmentSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(6, 'Valid phone number is required'),
  age: z.coerce.number().int().min(1, 'Age must be positive').max(120, 'Age must be <= 120'),
  height: z.string().min(1, 'Height is required'),
  weight: z.string().min(1, 'Weight is required'),
  gender: z.enum(['Female', 'Male', 'Non-Binary', 'Prefer not to say']),
  primaryGoal: z.string().min(5, 'Primary clinical goal is required'),
  medicalHistory: z.string().optional().default(''),
  dietaryPattern: z.string().optional().default(''),
  consultDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid consult date (YYYY-MM-DD) is required'),
  timeSlot: z.string().min(3, 'Time slot is required'),
});

/**
 * POST /api/appointments
 * Create a new clinical consultation appointment
 * Can be called either anonymously or by an authenticated user
 */
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const parsed = appointmentSchema.parse(req.body);

    const record = {
      user_id: req.user ? req.user.id : null,
      full_name: parsed.fullName,
      email: parsed.email.toLowerCase(),
      phone: parsed.phone,
      age: parsed.age,
      height: parsed.height,
      weight: parsed.weight,
      gender: parsed.gender,
      primary_goal: parsed.primaryGoal,
      medical_history: parsed.medicalHistory || null,
      dietary_pattern: parsed.dietaryPattern || null,
      consult_date: parsed.consultDate,
      time_slot: parsed.timeSlot,
      status: 'confirmed',
    };

    const client = req.supabase || supabase;

    // Concurrency guard: verify slot is not already reserved
    const { data: existingSlot } = await client
      .from('appointments')
      .select('id')
      .eq('consult_date', parsed.consultDate)
      .eq('time_slot', parsed.timeSlot)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existingSlot) {
      return res.status(409).json({
        success: false,
        error: 'This time slot is already reserved for the selected date. Please choose another window.',
      });
    }

    const { data, error } = await client
      .from('appointments')
      .insert(record)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Consultation appointment confirmed successfully.',
      appointment: data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments/booked-slots
 * Returns list of booked time slots for a given date
 */
router.get('/booked-slots', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, error: 'Query parameter "date" (YYYY-MM-DD) is required.' });
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('time_slot')
      .eq('consult_date', date)
      .neq('status', 'cancelled');

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const bookedSlots = (data || []).map((item) => item.time_slot);
    return res.json({
      success: true,
      date,
      bookedSlots,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments/my
 * Get all appointments for the currently logged-in user
 */
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('appointments')
      .select('*')
      .or(`user_id.eq.${req.user.id},email.eq.${req.user.email}`)
      .order('consult_date', { ascending: true });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      count: data.length,
      appointments: data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments/:id
 * Retrieve single appointment details
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = req.supabase || supabase;

    const { data, error } = await client
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Appointment not found.' });
    }

    return res.json({
      success: true,
      appointment: data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/appointments/:id/status
 * Update appointment status (pending, confirmed, completed, cancelled)
 */
router.patch('/:id/status', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const statusSchema = z.object({
      status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
    });
    const { status } = statusSchema.parse(req.body);

    const client = req.supabase || supabase;
    const { data, error } = await client
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      appointment: data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments
 * List appointments with optional query parameters (email, date, status)
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { email, date, status, limit = 50 } = req.query;
    const client = req.supabase || supabase;

    let query = client
      .from('appointments')
      .select('*')
      .order('consult_date', { ascending: false })
      .limit(Number(limit));

    if (email) query = query.eq('email', email);
    if (date) query = query.eq('consult_date', date);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      count: data.length,
      appointments: data,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
