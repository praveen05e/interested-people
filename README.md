# ZTOI — Product Interest Registration Platform

A production-ready, luxury minimalist landing page that lets visitors register their product interest in one click using Google authentication.

**Visitor opens the page → Clicks "I'm Interested" → Google sign-in (if needed) → Registration saved automatically → Google Sheet updated.**

---

## Architecture

```
React Frontend (Vite + TypeScript)
         ↓
Supabase Auth (Google OAuth 2.0)
         ↓
Supabase Edge Function (register-interest)
         ↓
Supabase PostgreSQL (duplicate prevention, source of truth)
         ↓
Google Sheets API (via Service Account)
         ↓
Google Spreadsheet (owner's view)
```

No admin dashboard — the owner reads customer data directly from Google Sheets.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account & project
- Google Cloud Console project
- Google Sheet (created and configured)

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run Development Server

```bash
npm run dev
```

---

## Configuration Guide

### Step 1 — Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Note your **Project URL** and **anon public key** (Settings → API)
3. Note your **Service Role key** (keep this secret — backend only)

### Step 2 — Database Migration

In your Supabase project → **SQL Editor**, paste and run the contents of:

```
supabase/migrations/001_create_registrations_table.sql
```

This creates:
- `product_interest_registrations` table with all constraints
- Unique constraints on `email` and `user_id`
- Row Level Security (public cannot read or write directly)
- Indexes for performance

### Step 3 — Google OAuth via Supabase

1. **Supabase Dashboard** → Authentication → Providers → Google → **Enable**
2. Go to [Google Cloud Console](https://console.cloud.google.com)
3. Create a new project (or use existing)
4. APIs & Services → **OAuth consent screen**:
   - User Type: External
   - App name: ZTOI
   - Scopes: `email`, `profile`, `openid`
5. APIs & Services → **Credentials** → Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://your-project-ref.supabase.co/auth/v1/callback`
6. Copy **Client ID** and **Client Secret** into Supabase → Authentication → Google provider

### Step 4 — Google Cloud Service Account

> Used server-side only. Never put this in frontend code.

1. Google Cloud Console → IAM & Admin → **Service Accounts** → Create
2. Name: `ztoi-sheets-writer`
3. No roles needed at project level
4. Create key → **JSON** → download the file

From the JSON file you need:
- `client_email` → this is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → this is your `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### Step 5 — Enable Google Sheets API

1. Google Cloud Console → APIs & Services → **Library**
2. Search "Google Sheets API" → **Enable**

### Step 6 — Share the Spreadsheet with the Service Account

Your Google Sheet (ID from the URL: `docs.google.com/spreadsheets/d/**SHEET_ID**/edit`):

1. Click **Share** in the top-right
2. Add the service account email: `ztoi-sheets-writer@your-project.iam.gserviceaccount.com`
3. Set role: **Editor**
4. Uncheck "Notify people" → **Share**

The spreadsheet should have a tab named **"Interested Customers"** with headers:
| Full Name | Gmail Address | Registered At |
|-----------|---------------|---------------|

### Step 7 — Deploy the Edge Function

Install [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
```

Set the backend secrets (never committed to git):

```bash
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL="ztoi-sheets-writer@your-project.iam.gserviceaccount.com"
supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
supabase secrets set GOOGLE_SHEET_ID="your-spreadsheet-id-from-url"
supabase secrets set GOOGLE_SHEET_TAB="Interested Customers"
```

Deploy the function:

```bash
supabase functions deploy register-interest --no-verify-jwt
```

### Step 8 — Build & Deploy Frontend

**Build:**
```bash
npm run build
```

**Deploy options:**

**Vercel (recommended):**
```bash
npx vercel --prod
```
Set environment variables in Vercel dashboard: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Netlify:**
```bash
npx netlify-cli deploy --prod --dir=dist
```

**Cloudflare Pages:**
Connect GitHub repo → Build command: `npm run build` → Output dir: `dist`

### Step 9 — Configure OAuth Redirect URLs

In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: `https://your-domain.com`

---

## Security Architecture

| Layer | Protection |
|-------|-----------|
| Frontend | Only public Supabase anon key — no secrets |
| Edge Function | Verifies JWT before any operation |
| Database | RLS enabled — no direct public access |
| Google Sheets | Service account key stored in Supabase secrets only |
| Duplicate prevention | Unique DB constraint (not just client-side) |
| Timestamps | Server-generated only |

---

## File Structure

```
├── src/
│   ├── components/
│   │   ├── HeroSection.tsx
│   │   ├── InterestButton.tsx
│   │   ├── StatusMessage.tsx
│   │   └── PrivacyNotice.tsx
│   ├── lib/
│   │   └── supabase.ts
│   ├── services/
│   │   └── registration.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── supabase/
│   ├── functions/
│   │   └── register-interest/
│   │       └── index.ts
│   └── migrations/
│       └── 001_create_registrations_table.sql
├── .env.example
└── README.md
```

---

## Test Checklist

| Test | Expected Result |
|------|----------------|
| Open landing page | Loads instantly, black luxury design |
| Click button (authenticated) | Auto-submits → "You're on the list!" |
| Click button (not signed in) | Google OAuth launches |
| Successful Google sign-in | Returns to page, registration completes |
| New email registers | 1 DB row + 1 Sheet row |
| Same email again | "You're already registered!" |
| Multiple rapid clicks | No duplicate rows |
| Cancel Google sign-in | Returns to page, no registration |
| Google Sheets unavailable | Saved to DB, sync_failed flagged |
| Mobile browser | Fully responsive |
| Inspect browser env vars | No private keys visible |

---

## Google Sheet Structure

| A — Full Name | B — Gmail Address | C — Registered At |
|---|---|---|
| Sample User | user@gmail.com | 22/11/2026, 14:30:00 |

---

## Troubleshooting

**"Missing Supabase environment variables"**  
→ Create `.env.local` from `.env.example` and fill in Supabase URL and anon key.

**"Google sign-in failed"**  
→ Verify OAuth redirect URI in Google Cloud Console matches:  
`https://your-project-ref.supabase.co/auth/v1/callback`

**Registration saved but sheet not updated**  
→ Check `sheet_sync_status` column in Supabase. If `sync_failed`:
1. Verify service account has Editor access to the sheet
2. Confirm Google Sheets API is enabled in GCP
3. Check `GOOGLE_SHEET_ID` secret is the spreadsheet ID only (not the full URL)

**"Invalid or expired authentication token"**  
→ Refresh the page and try again.
