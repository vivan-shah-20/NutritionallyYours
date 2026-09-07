# Nutritionally Yours — Backend API & Supabase Service

A full-fledged backend architecture for **Nutritionally Yours by Janhavi Shah**, powered by **Node.js, Express, and Supabase**.

---

## 🌟 Architecture Overview

```
backend/
├── db/
│   └── schema.sql             # Full PostgreSQL DDL (tables, triggers, RLS)
├── src/
│   ├── config/
│   │   └── supabase.js        # Supabase client & scoped JWT user client
│   ├── middleware/
│   │   ├── auth.js            # JWT Bearer token & optional auth middleware
│   │   └── errorHandler.js    # Centralized Zod validation & error handler
│   ├── routes/
│   │   ├── auth.routes.js     # Google OAuth URL & session management
│   │   ├── appointments.routes.js # Appointment booking & queries
│   │   └── users.routes.js    # User credentials & profile management
│   └── server.js              # Express app entry point
├── .env                       # Preconfigured Supabase keys
├── .env.example               # Environment variables template
├── package.json
└── README.md
```

---

## 🗄️ Database Tables (Supabase)

### 1. `public.profiles` (User Credentials & Google Identity)
Stores user account credentials synchronized directly with Supabase Auth:
- **`id`**: UUID (Primary Key, foreign key referencing `auth.users(id) ON DELETE CASCADE`)
- **`email`**: Text (Unique, Not Null)
- **`full_name`**: Text (User's display name from Google OAuth)
- **`avatar_url`**: Text (User's profile picture from Google)
- **`phone`**: Text
- **`role`**: Text (`client`, `admin`, `nutritionist`)
- **`created_at`**, **`updated_at`**: Timestamptz
- **Auto-Sync Trigger**: `on_auth_user_created` trigger automatically creates/updates a profile entry when a user logs in with Google.

### 2. `public.appointments` (Consultation Booking Details)
Stores all clinical intake data submitted via the consultation booking form:
- **`id`**: UUID (Primary Key, default `gen_random_uuid()`)
- **`user_id`**: UUID (Optional foreign key referencing `public.profiles(id)`)
- **`full_name`**: Patient's full name
- **`email`**: Patient's email
- **`phone`**: WhatsApp / phone contact
- **`age`**, **`height`**, **`weight`**, **`gender`**: Biomarker & physical metrics
- **`primary_goal`**: Health & clinical objectives
- **`medical_history`**: Diagnoses, medications, allergies
- **`dietary_pattern`**: Dietary lifestyle
- **`consult_date`**: Preferred appointment date
- **`time_slot`**: Preferred virtual slot
- **`status`**: Status (`pending`, `confirmed`, `completed`, `cancelled`)
- **`created_at`**, **`updated_at`**: Timestamptz

---

## 🔑 How to Enable Google OAuth Authentication in Supabase

Your Supabase project is already provisioned at:
**Project URL**: `https://jhutlggpbpalzkpzwkew.supabase.co`

To enable Google Sign-In:

1. **Go to Google Cloud Console**:
   - Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Create a project or select an existing one.
   - Configure **OAuth Consent Screen** (External, add App Name: *Nutritionally Yours*).
   - Go to **Credentials** -> **Create Credentials** -> **OAuth client ID**.
   - Application type: **Web application**.
   - Under **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `https://jhutlggpbpalzkpzwkew.supabase.co`
   - Under **Authorized redirect URIs**:
     - `https://jhutlggpbpalzkpzwkew.supabase.co/auth/v1/callback`
   - Click **Create** and copy your **Client ID** and **Client Secret**.

2. **Paste into Supabase Dashboard**:
   - Open [Supabase Dashboard](https://supabase.com/dashboard/project/jhutlggpbpalzkpzwkew/auth/providers).
   - Navigate to **Authentication** > **Providers** > **Google**.
   - Toggle **Enable Google provider** to ON.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Save**.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start Backend Server
```bash
# Production mode
npm start

# Development mode (with live file watch)
npm run dev
```
The server will start on `http://localhost:5001`.

---

## 📡 API Endpoints Reference

### Health Check
- `GET /api/health`: Verify backend & Supabase connection.

### Authentication & Sessions
- `GET /api/auth/google/url`: Returns Google OAuth sign-in URL.
  - Query parameter: `?redirectTo=http://localhost:5173/auth/callback`
- `GET /api/auth/session`: Returns current authenticated user and profile (`Authorization: Bearer <token>` required).
- `POST /api/auth/signout`: Terminates current session (`Authorization: Bearer <token>` required).

### Appointments
- `POST /api/appointments`: Create a new consultation appointment (can be submitted anonymously or with user auth token).
- `GET /api/appointments/my`: Get all appointments for the logged-in user (`Authorization: Bearer <token>` required).
- `GET /api/appointments/:id`: Retrieve single appointment details.
- `PATCH /api/appointments/:id/status`: Update status (`pending`, `confirmed`, `completed`, `cancelled`).
- `GET /api/appointments`: List appointments (supports `?email=`, `?date=`, `?status=`).

### Users & Profiles
- `GET /api/users/me`: Fetch authenticated user profile (`Authorization: Bearer <token>` required).
- `PUT /api/users/me`: Update profile metrics (`fullName`, `phone`, `avatarUrl`).
- `GET /api/users/:id`: View public profile by ID.
