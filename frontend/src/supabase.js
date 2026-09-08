import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jhutlggpbpalzkpzwkew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodXRsZ2dwYnBhbHprcHp3a2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTkzNzgsImV4cCI6MjEwNDE3NTM3OH0.GEUpi8bNJeelmmMXAHFx-KxEDPZT0weGu2Mb-AUE2Bg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Check if a user account exists in Supabase by email
 */
export async function checkUserExists(email) {
  try {
    const { data, error } = await supabase.rpc('check_user_exists', {
      lookup_email: email.trim(),
    });
    if (error) {
      console.warn('check_user_exists RPC note:', error);
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.warn('check_user_exists note:', err);
    return false;
  }
}

/**
 * Sign up with Email and Password
 */
export async function signUpWithEmail(email, password, fullName = '') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        full_name: fullName,
        name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Send Magic Login / Verification Link to email
 */
export async function sendVerificationLink(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out current session
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current session and user
 */
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}
