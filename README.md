# ZTOI TECH — Product Interest Registration Platform

A luxury minimalist, high-converting product interest registration page for **ZTOI TECH** that captures customer interest in a single frictionless touch using Google Identity Services and streams the data directly into a private Google Sheet.

**Visitor opens the page → Clicks "Register with Mail" → Selects account → Registered into Google Sheet (Full Name, Email, Country, Timestamp).**

---

## Live Demo & Production

- **Production URL:** [https://new-product.vercel.app](https://new-product.vercel.app)
- **Repository:** [https://github.com/praveen05e/interested-people](https://github.com/praveen05e/interested-people)

---

## Key Highlights

- **1-Touch Registration:** Zero typing required. Seamless Google Identity OAuth 2.0 account selection.
- **Zero-Click Country Detection:** Automatically detects visitor country via client-side IP geolocation with Intl timezone fallback.
- **Direct-to-Sheets Pipeline:** Google Apps Script Web App receives verified user payload and appends directly to Google Sheet.
- **Duplicate Prevention:** Google Apps Script checks for existing emails before inserting, guaranteeing clean records.
- **Serverless & Free:** No database servers, no Supabase, no AWS/GCP compute bills. Zero ongoing infrastructure costs.
- **Luxury Aesthetic:** Minimalist black luxury design with Michroma brand typography, warm orange glowing accents (`#FF4D00`), and smooth micro-animations.

---

## Architecture

```
User Browser (React + Vite + TypeScript)
       │
       ├─► Google Identity Services (OAuth 2.0 Web Client)
       │   └─ Returns Name, Email & Avatar
       │
       ├─► Geolocation Service (IP Geolocation + Intl Fallback)
       │   └─ Returns Detected Country (e.g., India, United States)
       │
       └─► Google Apps Script Web App (doPost)
           │
           ├─ Checks for duplicates in column B
           └─ Appends new row: [Full Name, Email Address, Country, Registered At]
                 │
                 ▼
           Google Sheet ("Interested Customers")
```

---

## Google Sheet Data Structure

The connected Google Sheet tab **`Interested Customers`** contains 4 columns:

| Column A | Column B | Column C | Column D |
| :--- | :--- | :--- | :--- |
| **Full Name** | **Email Address** | **Country** | **Registered At** |
| Praveen Kumar | example@gmail.com | India | 24/11/2026, 10:15:00 pm |

---

## Project Structure

```
├── google-apps-script/
│   └── Code.gs               # Backend webhook script for Google Sheet
├── public/
│   └── logo.png              # ZTOI TECH brand mark & favicon
├── src/
│   ├── assets/
│   │   ├── hero.png          # Product teaser visual
│   │   └── logo.png          # Header logo asset
│   ├── components/
│   │   ├── HeroSection.tsx   # Core landing section & registration state machine
│   │   ├── InterestButton.tsx# 1-Touch "Register with Mail" CTA button
│   │   └── PrivacyNotice.tsx # Minimalist privacy and data policy note
│   ├── services/
│   │   ├── country.ts        # Client-side zero-click country geolocation
│   │   └── registration.ts   # Google Identity Services & Apps Script bridge
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces & types
│   ├── App.css               # Clean luxury layout styles
│   ├── App.tsx               # Root component
│   ├── index.css             # Base resets and typography
│   └── main.tsx              # Application entry point
├── .env.example              # Environment variables template
├── index.html                # HTML entry point with fonts & meta tags
├── package.json              # Project dependencies & scripts
├── tsconfig.json             # TypeScript compiler settings
├── vercel.json               # Vercel deployment routing & headers
└── vite.config.ts            # Vite bundler configuration
```

---

## Local Development Setup

### 1. Prerequisites
- Node.js 18 or later
- npm or pnpm

### 2. Clone & Install
```bash
git clone https://github.com/praveen05e/interested-people.git
cd interested-people
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/your-deployment-id/exec
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Configuration & Deployment

### Step 1: Google Cloud Console OAuth Setup
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select your project.
3. Under **APIs & Services** → **OAuth consent screen**:
   - User Type: **External**
   - App Name: `ZTOI TECH`
   - Scopes: `email`, `profile`, `openid`
4. Under **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application Type: **Web application**
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `https://new-product.vercel.app` (and any custom domain)
5. Copy the generated **Client ID** to `VITE_GOOGLE_CLIENT_ID`.

### Step 2: Google Apps Script Setup
1. Create a new Google Sheet. Name the first sheet tab: `Interested Customers`.
2. In the Google Sheet menu, click **Extensions** → **Apps Script**.
3. Replace the editor contents with the code from [`google-apps-script/Code.gs`](file:///google-apps-script/Code.gs).
4. Click **Deploy** → **New deployment**:
   - Type: **Web app**
   - Description: `ZTOI TECH Interest Registration Webhook`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Authorize the script when prompted and copy the **Web app URL** to `VITE_APPS_SCRIPT_URL`.

### Step 3: Production Build & Deployment (Vercel)
```bash
npm run build
vercel --prod
```
Ensure `VITE_GOOGLE_CLIENT_ID` and `VITE_APPS_SCRIPT_URL` are added in your Vercel Project Settings under **Environment Variables**.

---

## License

Private & Proprietary — © ZTOI TECH. All rights reserved.
