# Nutritionally Yours

A modern, high-performance web platform for **Nutritionally Yours by Janhavi Shah** (Clinical Nutritionist & Lifestyle Consultant).

Featuring an Apple-style scroll-driven interactive frame animation, real-time consultation intake booking, Google OAuth integration, and a Node.js/Express backend integrated with Supabase.

---

## 🚀 Features

- **Interactive Canvas Scroll Engine**: Seamless 240-frame scrub animation synchronized with page scrolling.
- **Comprehensive Patient Intake**: Multi-step consultation modal capturing biomarkers, dietary habits, medical history, and scheduling slots.
- **Supabase Backend & Authentication**:
  - Google OAuth sign-in and user profile management.
  - PostgreSQL schema with Row-Level Security (RLS).
  - Patient appointment management with status tracking.
- **Vercel Deployment Ready**: Pre-configured `vercel.json` for frontend and API deployment.

---

## 📁 Repository Structure

```
NutritionallyYours/
├── frontend/                     # Vite + Vanilla JS + CSS Frontend
│   ├── public/frames/           # Canvas sequence frames (1 to 240)
│   ├── src/
│   │   ├── main.js              # Canvas animation, booking modal, auth logic
│   │   ├── style.css            # Responsive styles & design system
│   │   └── supabase.js          # Supabase client configuration
│   ├── index.html               # Main landing page
│   ├── package.json
│   └── vercel.json
├── backend/                      # Node.js + Express + Supabase API
│   ├── db/
│   │   └── schema.sql           # Database schema, triggers & RLS policies
│   ├── src/
│   │   ├── config/supabase.js   # Supabase client initialization
│   │   ├── middleware/          # Auth JWT verification & error handling
│   │   ├── routes/              # Auth, appointments, and users routes
│   │   └── server.js            # Express application entrypoint
│   ├── .env.example             # Environment variable template
│   ├── package.json
│   └── README.md
├── vercel.json                   # Root deployment configuration
└── .gitignore
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev # or npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to explore the site.

---

## 📜 License

Private project. All rights reserved.
