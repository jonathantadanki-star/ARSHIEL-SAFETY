# ARSHIEL SAFETY — AI-Powered Enterprise EHS & Digital Safety Intelligence Platform

**ARSHIEL SAFETY** (`ARSHIEL EHS AI SOLUTIONS`) & **ARSHIEL ASSURANCE**  
Founded, Owned & Developed by **Jonathan Thadanki**  
Direct Contact: `jonathan.tadanki@gmail.com` | `+91 9133 661 933` / `+91 81 84 83 40 60` / `+91 81 86 80 88 48`

---

## Overview

**ARSHIEL SAFETY** is a multi-tenant Enterprise Environment, Health, Safety (EHS), HSE, SHE, Risk Management, Smart Permit to Work, Compliance, and ESG Sustainability platform built with React, TypeScript, Tailwind CSS, Express, PostgreSQL / Drizzle ORM, and Firebase Authentication.

- **`/`** — AI Digital EHS Command Centre Landing Page (with `ARSHIEL SAFETY` vs. `ARSHIEL ASSURANCE` brand separation, interactive demos labeled `DEMO DATA – NOT LIVE OPERATIONAL DATA`, Global Legal & ISO Compliance Engine, Digital Twin Safety Map preview, and live Demo/Assessment Request form).
- **`/overview`** — Classic Enterprise Overview Homepage.
- **`/app`** — Protected Multi-Tenant EHS Workspace featuring:
  - **ARSHIEL INTELLIGENCE HUB** (`Industry Intelligence` across 15 sectors, `Data Intelligence` with strict `LIVE DATA` / `DEMO DATA` / `AI FORECAST` separation, `My Dashboard`, `Alert Centre`, and `Reports` with PDF/Excel/CSV export).
  - **24+ Enterprise EHS Modules**: Smart Permit to Work (QR verification & 6-stage approvals), LOTO, Incidents & 5-Why RCA/CAPA, HIRA/HAZOP, AI Safety Observations, Audits & Inspections, Equipment Calibration, Training Matrix, Environmental & ESG/GHG Tracking, Legal Register, Emergency Management, Document Control, and Master KPI Hub.
  - **Sole Super Admin Governance**: Dynamic Module Builder, Admin & Settings, Notification Engine, and Source Code Export locked strictly to the verified platform owner.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide Icons, PWA support
- **Backend**: Node.js, Express (`server.ts`), Drizzle ORM, PostgreSQL (`pg`), Helmet, Express Rate Limit
- **Authentication**: Firebase Authentication + server-side token verification & RBAC
- **Document & Data Export**: `jspdf`, `jspdf-autotable`, `xlsx`
- **AI Assistance**: Server-side `@google/genai` RAG Safety Copilot (outputs explicitly marked as `AI Draft` requiring competent human approval)

---

## Local Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and populate the required values (`DATABASE_URL`, `GEMINI_API_KEY`, and any optional email/SMS/Discord/Supabase Storage keys):
   ```bash
   cp .env.example .env
   ```
   > Never commit `.env` or secret credentials to GitHub. `.gitignore` is configured to exclude all `.env*` files except `.env.example`.

3. **Run development server (Port 3000)**
   ```bash
   npm run dev
   ```

4. **Type-check and build for production**
   ```bash
   npm run lint
   npm run build
   npm start
   ```

---

## Pushing to GitHub (Manual CLI Method)

If you downloaded the project archive from the workspace or Super Admin Control Center, run these commands inside the extracted project folder:

```bash
git init
git add .
git commit -m "Initial commit: ARSHIEL SAFETY Enterprise EHS Platform"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/arshiel-safety.git
git push -u origin main
```

---

## Legal & Governance Notice

- **ARSHIEL SAFETY** provides enterprise EHS software tools.
- **ARSHIEL ASSURANCE** provides ISO readiness consultancy, gap assessments, audit support, and training — it is not an accredited third-party certification body.
- All AI-generated HIRAs, JSAs, SOPs, RCAs, and forecasts are preliminary drafts requiring competent human review and approval prior to operational use.

&copy; 2026 **Jonathan Thadanki** — ARSHIEL SAFETY / ARSHIEL EHS AI SOLUTIONS. All rights reserved.
