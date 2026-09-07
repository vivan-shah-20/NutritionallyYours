// Nutritionally Yours by Janhavi Shah - Luxury Clinical Nutrition Engine
import { supabase, signOutUser, signUpWithEmail, signInWithEmail, sendVerificationLink, checkUserExists } from './supabase.js';

const TOTAL_FRAMES = 240;
const images = [];
let loadedCount = 0;
let currentFrame = 1;
let targetFrame = 1;
let hasReachedEnd = false;
let currentSession = null;
let authMode = 'signin'; // 'signin' or 'signup'

// DOM Elements
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloader-bar');
const preloaderStatus = document.getElementById('preloader-status');
const heroSection = document.getElementById('hero');

const caption1 = document.getElementById('caption-1');
const caption2 = document.getElementById('caption-2');
const caption3 = document.getElementById('caption-3');

// Auth DOM Elements
const navLoginBtn = document.getElementById('navLoginBtn');
const navUserPill = document.getElementById('navUserPill');
const navUserAvatar = document.getElementById('navUserAvatar');
const navUserInitial = document.getElementById('navUserInitial');
const navUserName = document.getElementById('navUserName');
const navLogoutBtn = document.getElementById('navLogoutBtn');

const authModal = document.getElementById('authModal');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
const authModalTitle = document.getElementById('authModalTitle');
const authModalSubtitle = document.getElementById('authModalSubtitle');
const tabSignIn = document.getElementById('tabSignIn');
const tabSignUp = document.getElementById('tabSignUp');
const emailAuthForm = document.getElementById('emailAuthForm');
const signupNameGroup = document.getElementById('signupNameGroup');
const authFullNameInput = document.getElementById('authFullName');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const authMessageBox = document.getElementById('authMessageBox');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSubmitText = document.getElementById('authSubmitText');
const authNotice = document.getElementById('authNotice');

// Consultation Form Elements
const consultationForm = document.getElementById('consultation-form');
const consultDateInput = document.getElementById('consultDate');
const timeSlotSelect = document.getElementById('timeSlot');
const slotAvailabilityHint = document.getElementById('slotAvailabilityHint');
const confirmationModal = document.getElementById('confirmationModal');
const closeReceiptBtn = document.getElementById('closeReceiptBtn');
const recName = document.getElementById('recName');
const recMetrics = document.getElementById('recMetrics');
const recGoals = document.getElementById('recGoals');
const recDate = document.getElementById('recDate');

// Progressive Image Buffer with Instant Initial Interactivity
const INITIAL_PRIORITY_FRAMES = 12;
let preloaderDismissed = false;

function dismissPreloader() {
  if (preloaderDismissed) return;
  preloaderDismissed = true;
  if (preloaderBar) preloaderBar.style.width = '100%';
  if (preloaderStatus) preloaderStatus.innerText = 'Harmonizing botanicals 100%';
  setTimeout(() => {
    if (preloader) preloader.classList.add('hidden');
    resizeCanvas();
    renderFrame(1);
  }, 120);
}

function loadSingleFrame(index, callback) {
  const img = new Image();
  const frameNumber = String(index).padStart(3, '0');
  img.src = `/frames/ezgif-frame-${frameNumber}.jpg`;
  img.onload = () => {
    images[index - 1] = img;
    loadedCount++;
    if (index === 1 || Math.round(currentFrame) === index) {
      renderFrame(currentFrame);
    }
    if (callback) callback();
  };
  img.onerror = () => {
    loadedCount++;
    if (callback) callback();
  };
}

function preloadImages() {
  // Pre-fill image array with nulls
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    images.push(null);
  }

  // 1. Immediately load initial priority frames for instant visual render
  let initialLoaded = 0;
  for (let i = 1; i <= INITIAL_PRIORITY_FRAMES; i++) {
    loadSingleFrame(i, () => {
      initialLoaded++;
      const progress = Math.min(Math.round((initialLoaded / INITIAL_PRIORITY_FRAMES) * 100), 100);
      if (preloaderBar) preloaderBar.style.width = `${progress}%`;
      if (preloaderStatus) preloaderStatus.innerText = `Harmonizing botanicals ${progress}%`;

      if (initialLoaded >= 4) {
        dismissPreloader();
      }
    });
  }

  // Safety fallback: dismiss preloader after 450ms maximum so user is never blocked
  setTimeout(dismissPreloader, 450);

  // 2. Progressively load remaining frames in small batches during idle intervals
  // Keeping network bandwidth completely clear for instant Supabase Auth & Booking
  const queueRemainingFrames = () => {
    let cursor = INITIAL_PRIORITY_FRAMES + 1;
    const BATCH_SIZE = 6;

    function processBatch() {
      if (cursor > TOTAL_FRAMES) return;
      const limit = Math.min(cursor + BATCH_SIZE, TOTAL_FRAMES + 1);
      let batchPending = limit - cursor;

      for (let f = cursor; f < limit; f++) {
        loadSingleFrame(f, () => {
          batchPending--;
          if (batchPending === 0) {
            cursor = limit;
            if ('requestIdleCallback' in window) {
              requestIdleCallback(processBatch, { timeout: 80 });
            } else {
              setTimeout(processBatch, 25);
            }
          }
        });
      }
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(processBatch, { timeout: 150 });
    } else {
      setTimeout(processBatch, 40);
    }
  };

  setTimeout(queueRemainingFrames, 100);
}

// Canvas Sizing with Retina / High-DPI Sharpness
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  renderFrame(Math.round(currentFrame));
}

// Draw Frame to Canvas with Centered Aspect Fit and ready-frame fallback
function renderFrame(frameIndex) {
  const clampedIndex = Math.min(Math.max(Math.round(frameIndex), 1), TOTAL_FRAMES);
  let img = images[clampedIndex - 1];

  // Fallback to nearest loaded frame if current frame is still buffering
  if (!img || !img.complete || img.naturalWidth === 0) {
    for (let i = clampedIndex - 1; i >= 0; i--) {
      if (images[i] && images[i].complete && images[i].naturalWidth > 0) {
        img = images[i];
        break;
      }
    }
    if (!img) {
      for (let i = clampedIndex; i < TOTAL_FRAMES; i++) {
        if (images[i] && images[i].complete && images[i].naturalWidth > 0) {
          img = images[i];
          break;
        }
      }
    }
  }

  if (!img || !img.complete || img.naturalWidth === 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const viewWidth = canvas.width / dpr;
  const viewHeight = canvas.height / dpr;

  // Pure white canvas background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // 16:9 native frame ratio
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const viewRatio = viewWidth / viewHeight;

  let drawWidth, drawHeight, offsetX, offsetY;

  // Refined margins for luxury editorial presentation
  const padding = viewWidth > 900 ? 0.94 : 1.0;

  if (viewRatio > imgRatio) {
    drawHeight = viewHeight * padding;
    drawWidth = drawHeight * imgRatio;
  } else {
    drawWidth = viewWidth * padding;
    drawHeight = drawWidth / imgRatio;
  }

  offsetX = (viewWidth - drawWidth) / 2;
  offsetY = (viewHeight - drawHeight) / 2;

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

// Scroll position calculation: maps 1 -> 240 strictly once, no looping
function updateScrollTarget() {
  const rect = heroSection.getBoundingClientRect();
  const maxScroll = heroSection.offsetHeight - window.innerHeight;

  if (maxScroll <= 0) return;

  // Calculate progress within hero section
  let progress = -rect.top / maxScroll;

  if (progress >= 1) {
    // Reached or passed the end of the hero runway: lock firmly on final frame
    targetFrame = TOTAL_FRAMES;
    hasReachedEnd = true;
  } else if (progress <= 0) {
    targetFrame = 1;
  } else {
    targetFrame = 1 + progress * (TOTAL_FRAMES - 1);
  }
}

let initialRenderComplete = false;

// Silky smooth LERP render loop
function animationLoop() {
  const diff = targetFrame - currentFrame;

  if (Math.abs(diff) > 0.005) {
    currentFrame += diff * 0.15; // Smooth inertia
    renderFrame(currentFrame);
    updateCaptions(currentFrame);
  } else if (!initialRenderComplete && images[0] && images[0].complete && images[0].naturalWidth > 0) {
    initialRenderComplete = true;
    renderFrame(currentFrame);
    updateCaptions(currentFrame);
  }

  requestAnimationFrame(animationLoop);
}

// Update Editorial Captions based on progress
function updateCaptions(frame) {
  const intFrame = Math.round(frame);

  if (intFrame < 75) {
    caption1.classList.add('active');
    caption2.classList.remove('active');
    caption3.classList.remove('active');
  } else if (intFrame >= 75 && intFrame < 165) {
    caption1.classList.remove('active');
    caption2.classList.add('active');
    caption3.classList.remove('active');
  } else {
    caption1.classList.remove('active');
    caption2.classList.remove('active');
    caption3.classList.add('active');
  }
}

// Standard Available Consultation Slots
const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5001' : null);

const BASE_SLOTS = [
  'Morning (10:00 AM - 11:00 AM)',
  'Midday (01:00 PM - 02:00 PM)',
  'Afternoon (03:30 PM - 04:30 PM)',
  'Evening (05:30 PM - 06:30 PM)',
];

// Fetch and update unavailable slots dynamically for a given date
async function updateSlotAvailability(date) {
  if (!timeSlotSelect || !date) return;

  try {
    let bookedSlots = [];
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/appointments/booked-slots?date=${date}`);
        if (res.ok) {
          const json = await res.json();
          bookedSlots = json.bookedSlots || [];
        } else {
          throw new Error('Backend slot fetch failed');
        }
      } catch {
        // Fallback directly to Supabase client
        const { data } = await supabase
          .from('appointments')
          .select('time_slot')
          .eq('consult_date', date)
          .neq('status', 'cancelled');
        bookedSlots = (data || []).map((row) => row.time_slot);
      }
    } else {
      // Direct Supabase query when hosted on Vercel / serverless
      const { data } = await supabase
        .from('appointments')
        .select('time_slot')
        .eq('consult_date', date)
        .neq('status', 'cancelled');
      bookedSlots = (data || []).map((row) => row.time_slot);
    }

    const availableCount = BASE_SLOTS.length - bookedSlots.length;

    // Update interactive slot cards
    const slotCards = document.querySelectorAll('.slot-select-card');
    slotCards.forEach((card) => {
      const slotVal = card.dataset.slot;
      const isBooked = bookedSlots.includes(slotVal);
      const statusBadge = card.querySelector('.slot-badge-status');

      if (isBooked) {
        card.disabled = true;
        card.classList.add('is-booked');
        card.classList.remove('selected');
        if (statusBadge) {
          statusBadge.innerText = 'Booked';
          statusBadge.className = 'slot-badge-status booked';
        }
      } else {
        card.disabled = false;
        card.classList.remove('is-booked');
        if (statusBadge) {
          statusBadge.innerText = 'Available';
          statusBadge.className = 'slot-badge-status available';
        }
      }
    });

    Array.from(timeSlotSelect.options).forEach((opt) => {
      if (!opt.value) return; // Skip placeholder option
      const isBooked = bookedSlots.includes(opt.value);
      if (isBooked) {
        opt.disabled = true;
        opt.innerText = `${opt.value} — (Booked)`;
        opt.style.color = '#a0aec0';
        if (timeSlotSelect.value === opt.value) {
          timeSlotSelect.value = '';
          syncSelectedSlotCard('');
        }
      } else {
        opt.disabled = false;
        opt.innerText = opt.value;
        opt.style.color = '';
      }
    });

    // Remove the message "All consultation windows available for..." as requested
    if (slotAvailabilityHint) {
      if (availableCount <= 0) {
        slotAvailabilityHint.innerText = '⚠️ All virtual consultation slots are fully booked for this date. Please choose another date.';
        slotAvailabilityHint.className = 'slot-availability-hint warning';
        slotAvailabilityHint.classList.remove('hidden');
      } else {
        slotAvailabilityHint.innerText = '';
        slotAvailabilityHint.className = 'slot-availability-hint hidden';
      }
    }
  } catch (err) {
    console.warn('Slot check notice:', err);
  }
}

// Interactive Slot Card Selection Handler
function setupSlotCardSelection() {
  const slotCards = document.querySelectorAll('.slot-select-card');
  slotCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      if (card.disabled || card.classList.contains('is-booked')) return;
      const slotVal = card.dataset.slot;
      if (timeSlotSelect) {
        timeSlotSelect.value = slotVal;
      }
      syncSelectedSlotCard(slotVal);
    });
  });

  if (timeSlotSelect) {
    timeSlotSelect.addEventListener('change', () => {
      syncSelectedSlotCard(timeSlotSelect.value);
    });
  }
}

function syncSelectedSlotCard(selectedValue) {
  const slotCards = document.querySelectorAll('.slot-select-card');
  slotCards.forEach((card) => {
    if (card.dataset.slot === selectedValue) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

// Configure Tomorrow as Minimum Date for Consultation
function setupDatePicker() {
  if (!consultDateInput) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  consultDateInput.min = minDate;
  if (!consultDateInput.value) {
    consultDateInput.value = minDate;
  }
  updateSlotAvailability(consultDateInput.value);
  consultDateInput.addEventListener('change', () => {
    updateSlotAvailability(consultDateInput.value);
  });
  consultDateInput.addEventListener('input', () => {
    updateSlotAvailability(consultDateInput.value);
  });
}

// ==================== AUTHENTICATION LOGIC ====================
function handleAuthState(session) {
  currentSession = session;
  const user = session?.user;

  if (user) {
    // User is logged in
    if (navLoginBtn) navLoginBtn.style.display = 'none';
    if (navUserPill) {
      navUserPill.classList.remove('hidden');
      navUserPill.style.display = 'inline-flex';
    }

    const meta = user.user_metadata || {};
    const fullName = meta.full_name || meta.name || user.email?.split('@')[0] || 'Client';
    const avatarUrl = meta.avatar_url || meta.picture || '';

    if (navUserName) navUserName.innerText = fullName.split(' ')[0];

    if (avatarUrl && navUserAvatar) {
      navUserAvatar.src = avatarUrl;
      navUserAvatar.style.display = 'block';
      if (navUserInitial) navUserInitial.style.display = 'none';
    } else if (navUserInitial) {
      navUserInitial.innerText = fullName.charAt(0).toUpperCase();
      navUserInitial.style.display = 'flex';
      if (navUserAvatar) navUserAvatar.style.display = 'none';
    }

    // Auto-populate Consultation Form if inputs are empty
    const nameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    if (nameInput && !nameInput.value) nameInput.value = fullName;
    if (emailInput && !emailInput.value && user.email) emailInput.value = user.email;

    // Dismiss modal immediately
    if (authModal) authModal.classList.remove('open');
  } else {
    // User is logged out
    if (navLoginBtn) navLoginBtn.style.display = 'inline-flex';
    if (navUserPill) {
      navUserPill.classList.add('hidden');
      navUserPill.style.display = 'none';
    }
  }
}

// Supabase Auth Listeners: Real-time sync and auto-restoration on load
supabase.auth.onAuthStateChange((_event, session) => {
  handleAuthState(session);
});

// Snappy session check on initial load
supabase.auth.getSession().then(({ data }) => {
  handleAuthState(data?.session || null);
}).catch((err) => {
  console.warn('Initial session check note:', err);
});

// Logout handler
if (navLogoutBtn) {
  navLogoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      navLogoutBtn.disabled = true;
      await signOutUser();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      handleAuthState(null);
      navLogoutBtn.disabled = false;
    }
  });
}

// Helper: Display message inside Auth Modal
function showAuthMessage(message, type = 'error') {
  if (!authMessageBox) return;
  authMessageBox.textContent = message;
  authMessageBox.className = `auth-message-box ${type}`;
  authMessageBox.classList.remove('hidden');
}

function clearAuthMessage() {
  if (!authMessageBox) return;
  authMessageBox.innerHTML = '';
  authMessageBox.className = 'auth-message-box hidden';
}

// Mode Switcher: Sign In vs Create Account
function switchAuthMode(mode) {
  authMode = mode;
  clearAuthMessage();

  if (mode === 'signup') {
    if (tabSignUp) tabSignUp.classList.add('active');
    if (tabSignIn) tabSignIn.classList.remove('active');
    if (authModalTitle) authModalTitle.innerText = 'Create Account';
    if (authModalSubtitle) authModalSubtitle.innerText = 'Register with your email to receive clinical care & private protocols.';
    if (authSubmitText) authSubmitText.innerText = 'Create Account';
    if (signupNameGroup) signupNameGroup.classList.remove('hidden');
    if (authFullNameInput) authFullNameInput.required = true;
  } else {
    if (tabSignIn) tabSignIn.classList.add('active');
    if (tabSignUp) tabSignUp.classList.remove('active');
    if (authModalTitle) authModalTitle.innerText = 'Sign In';
    if (authModalSubtitle) authModalSubtitle.innerText = 'Access your private clinical assessments and personalized dietary protocols.';
    if (authSubmitText) authSubmitText.innerText = 'Sign In';
    if (signupNameGroup) signupNameGroup.classList.add('hidden');
    if (authFullNameInput) authFullNameInput.required = false;
  }
  resetPasswordVisibility();
}

// Reset password field to masked type="password" with open eye icon
function resetPasswordVisibility() {
  if (!authPasswordInput) return;
  authPasswordInput.type = 'password';
  const eyeOpen = togglePasswordBtn?.querySelector('.eye-open');
  const eyeClosed = togglePasswordBtn?.querySelector('.eye-closed');
  if (eyeOpen) eyeOpen.classList.remove('hidden');
  if (eyeClosed) eyeClosed.classList.add('hidden');
  if (togglePasswordBtn) {
    togglePasswordBtn.setAttribute('aria-label', 'Show password');
  }
}

// Password visibility eye toggle handler
if (togglePasswordBtn && authPasswordInput) {
  togglePasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isCurrentlyPassword = authPasswordInput.type === 'password';
    authPasswordInput.type = isCurrentlyPassword ? 'text' : 'password';

    const eyeOpen = togglePasswordBtn.querySelector('.eye-open');
    const eyeClosed = togglePasswordBtn.querySelector('.eye-closed');

    if (eyeOpen) eyeOpen.classList.toggle('hidden', isCurrentlyPassword);
    if (eyeClosed) eyeClosed.classList.toggle('hidden', !isCurrentlyPassword);

    togglePasswordBtn.setAttribute('aria-label', isCurrentlyPassword ? 'Hide password' : 'Show password');
    authPasswordInput.focus();
  });
}

if (tabSignIn) {
  tabSignIn.addEventListener('click', () => switchAuthMode('signin'));
}

if (tabSignUp) {
  tabSignUp.addEventListener('click', () => switchAuthMode('signup'));
}

// Open Auth Modal
if (navLoginBtn && authModal) {
  navLoginBtn.addEventListener('click', () => {
    clearAuthMessage();
    resetPasswordVisibility();
    authModal.classList.add('open');
    if (authEmailInput) authEmailInput.focus();
  });
}

// Close Auth Modal
if (closeAuthModalBtn && authModal) {
  closeAuthModalBtn.addEventListener('click', () => {
    authModal.classList.remove('open');
    clearAuthMessage();
    resetPasswordVisibility();
  });
}

if (authModal) {
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
      authModal.classList.remove('open');
      clearAuthMessage();
      resetPasswordVisibility();
    }
  });
}

// Fast Email & Password Form Handler
if (emailAuthForm) {
  emailAuthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthMessage();

    const email = authEmailInput?.value.trim();
    const password = authPasswordInput?.value;
    const fullName = authFullNameInput?.value.trim() || '';

    if (!email || !password) {
      showAuthMessage('Please provide both email and password.', 'error');
      return;
    }

    if (password.length < 6) {
      showAuthMessage('Password must be at least 6 characters long.', 'error');
      return;
    }

    // Set loading state and user notification
    if (authSubmitBtn) {
      authSubmitBtn.disabled = true;
    }

    if (authMode === 'signup') {
      if (authSubmitText) authSubmitText.innerText = 'Please wait while we are creating your account...';
      showAuthMessage('Please wait while we are creating your account...', 'info');
    } else {
      if (authSubmitText) authSubmitText.innerText = 'Please wait while we log you in...';
      showAuthMessage('Please wait while we log you in...', 'info');
    }

    try {
      if (authMode === 'signup') {
        const data = await signUpWithEmail(email, password, fullName);
        if (data?.session) {
          handleAuthState(data.session);
          if (authModal) authModal.classList.remove('open');
          emailAuthForm.reset();
          resetPasswordVisibility();
        } else {
          showAuthMessage(
            `✨ Account registered! If email confirmation is required, please check ${email}, or switch to Sign In.`,
            'info'
          );
          emailAuthForm.reset();
          resetPasswordVisibility();
        }
      } else {
        const data = await signInWithEmail(email, password);
        if (data?.session) {
          handleAuthState(data.session);
        }
        // Instant modal close on successful login
        if (authModal) authModal.classList.remove('open');
        emailAuthForm.reset();
        resetPasswordVisibility();
      }
    } catch (err) {
      console.error('Authentication error:', err);
      const errorMsg = err.message || 'Authentication failed.';
      const isWrongCreds = errorMsg.includes('Invalid login credentials') || errorMsg.includes('invalid_grant');

      if (isWrongCreds) {
        // Accurately differentiate between non-existent user and incorrect password
        const userExists = await checkUserExists(email);
        if (!userExists) {
          showAuthMessage('User does not exist', 'error');
        } else {
          showAuthMessage('Incorrect email or password', 'error');
        }
      } else if (errorMsg.includes('Email not confirmed')) {
        showAuthMessage(`Please verify your email address. A confirmation link was dispatched to ${email}.`, 'info');
        const resendBtn = document.createElement('button');
        resendBtn.type = 'button';
        resendBtn.className = 'btn-send-magic-link';
        resendBtn.innerText = `Resend Verification Link to ${email}`;
        resendBtn.addEventListener('click', async () => {
          try {
            await sendVerificationLink(email);
            showAuthMessage(`✨ Verification link resent to ${email}!`, 'success');
          } catch (e) {
            showAuthMessage(e.message, 'error');
          }
        });
        if (authMessageBox) authMessageBox.appendChild(resendBtn);
      } else {
        showAuthMessage(errorMsg, 'error');
      }
    } finally {
      if (authSubmitBtn) {
        authSubmitBtn.disabled = false;
        authSubmitText.innerText = authMode === 'signup' ? 'Create Account' : 'Sign In';
      }
    }
  });
}

// Consultation Form Submission & Modal Receipt
if (consultationForm) {
  consultationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const age = document.getElementById('age').value.trim();
    const height = document.getElementById('height').value.trim();
    const weight = document.getElementById('weight').value.trim();
    const gender = document.getElementById('gender').value;
    const userGoal = document.getElementById('userGoal').value.trim();
    const medicalHistory = document.getElementById('medicalHistory')?.value.trim() || '';
    const dietaryPattern = document.getElementById('dietaryPattern')?.value.trim() || '';
    const consultDate = consultDateInput.value;
    const timeSlot = document.getElementById('timeSlot').value;

    // Populate Receipt Modal
    recName.innerText = fullName;
    recMetrics.innerText = `${gender}, ${age} yrs • ${height} • ${weight}`;
    recGoals.innerText = userGoal || 'Comprehensive Clinical Metabolic Assessment';
    recDate.innerText = `${consultDate} (${timeSlot})`;

    // Display modal immediately for responsiveness
    confirmationModal.classList.add('open');

    // Async sync to Supabase (via backend API if available, or direct Supabase client for Vercel)
    try {
      let saved = false;

      if (API_BASE_URL) {
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (currentSession?.access_token) {
            headers['Authorization'] = `Bearer ${currentSession.access_token}`;
          }

          const res = await fetch(`${API_BASE_URL}/api/appointments`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              fullName,
              email,
              phone,
              age: parseInt(age, 10),
              height,
              weight,
              gender,
              primaryGoal: userGoal,
              medicalHistory,
              dietaryPattern,
              consultDate,
              timeSlot,
            }),
          });

          if (!res.ok) {
            if (res.status === 409) {
              confirmationModal.classList.remove('open');
              alert('This time slot is already booked for this date. Please choose another window.');
              updateSlotAvailability(consultDate);
              return;
            }
            throw new Error(`API error: ${res.status}`);
          }
          saved = true;
        } catch (apiErr) {
          console.warn('Backend API request notice, falling back to direct Supabase client:', apiErr);
        }
      }

      // If backend API is not configured or failed, save directly via Supabase client (Vercel-native)
      if (!saved) {
        // Double-check slot conflict directly in Supabase
        const { data: existingConflict } = await supabase
          .from('appointments')
          .select('id')
          .eq('consult_date', consultDate)
          .eq('time_slot', timeSlot)
          .neq('status', 'cancelled')
          .maybeSingle();

        if (existingConflict) {
          confirmationModal.classList.remove('open');
          alert('This time slot is already booked for this date. Please choose another window.');
          updateSlotAvailability(consultDate);
          return;
        }

        const { error: insertError } = await supabase.from('appointments').insert({
          user_id: currentSession?.user?.id || null,
          full_name: fullName,
          email,
          phone,
          age: parseInt(age, 10) || null,
          height,
          weight,
          gender,
          primary_goal: userGoal,
          medical_history: medicalHistory || '',
          dietary_pattern: dietaryPattern || '',
          consult_date: consultDate,
          time_slot: timeSlot,
          status: 'confirmed',
        });

        if (insertError) {
          console.error('Supabase appointment insertion error:', insertError);
        }
      }

      // Refresh slot availability for that date so it is instantly marked booked
      updateSlotAvailability(consultDate);
    } catch (err) {
      console.warn('Appointment booking sync notice:', err);
      updateSlotAvailability(consultDate);
    }
  });
}

if (closeReceiptBtn) {
  closeReceiptBtn.addEventListener('click', () => {
    confirmationModal.classList.remove('open');
    consultationForm.reset();
    syncSelectedSlotCard('');
    setupDatePicker();
  });
}

// Close modal when clicking on backdrop outside card
if (confirmationModal) {
  confirmationModal.addEventListener('click', (e) => {
    if (e.target === confirmationModal) {
      confirmationModal.classList.remove('open');
      consultationForm.reset();
      syncSelectedSlotCard('');
    }
  });
}

// Global Event Listeners
window.addEventListener('scroll', updateScrollTarget, { passive: true });
window.addEventListener('resize', () => {
  resizeCanvas();
  updateScrollTarget();
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    resizeCanvas();
    updateScrollTarget();
  }, 150);
});

// Initialize
setupDatePicker();
setupSlotCardSelection();
preloadImages();
animationLoop();

