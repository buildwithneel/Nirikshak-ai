# NIRIKSHAK AI — Production Deployment Manual

## Final Milestone Deployment Architecture: GitHub + Supabase + Google OAuth + Render + Vercel


                         CITIZEN / ENFORCEMENT OFFICER
                                       │
                                       ▼
                             ┌──────────────────┐
                             │  Vercel Frontend │
                             │   React / Vite   │
                             └─────────┬────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
         ┌─────────────────────┐               ┌────────────────────┐
         │    Supabase Auth    │               │  Render Web Service│
         │          │          │               │  FastAPI / RapidOCR│
         │    Google OAuth     │               └──────────┬─────────┘
         └─────────────────────┘                          │
                                        ┌─────────────────┼─────────────────┐
                                        ▼                 ▼                 ▼
                                  Supabase DB      Supabase Storage      PaddleOCR
                                   PostgreSQL        Images & PDFs      ONNX Engine


## 1. Environment Variable Reference Matrix

| Variable Name | Purpose | Target Service | Required | Classification |
| :--- | :--- | :--- | :---: | :--- |
| `ENVIRONMENT` | Operational mode (`production`, `development`) | Render | Yes | Server Config |
| `PORT` | Dynamic listening port assigned by hosting platform | Render | Auto | Server Config |
| `DATABASE_URL` | PostgreSQL connection URI for Supabase | Render | Yes | **Backend Secret** |
| `SEED_DEMO_DATA` | Prevent automatic demo seeding in production (`false`) | Render | Yes | Server Config |
| `SUPABASE_URL` | Supabase project API gateway endpoint | Render | Yes | Backend Config |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for storage & auth admin ops | Render | Yes | **Critical Secret** |
| `SUPABASE_JWT_SECRET` | Secret to decode and verify Supabase Auth JWTs | Render | Yes | **Backend Secret** |
| `SUPABASE_BUCKET_INSPECTIONS`| Private bucket name (`inspection-images`) | Render | Yes | Server Config |
| `SUPABASE_BUCKET_COMPLAINTS` | Private bucket name (`complaint-images`) | Render | Yes | Server Config |
| `SUPABASE_BUCKET_REPORTS` | Private bucket name (`reports`) | Render | Yes | Server Config |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | Render | Yes | Server Config |
| `JWT_SECRET_KEY` | Fallback internal JWT signing key | Render | Yes | **Backend Secret** |
| `VITE_API_BASE_URL` | Render Web Service URL (e.g. `https://nirikshak-api.onrender.com`) | Vercel | Yes | **Frontend Public** |
| `VITE_SUPABASE_URL` | Supabase project URL for browser client | Vercel | Yes | **Frontend Public** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Anon/Publishable API key | Vercel | Yes | **Frontend Public** |

> [!CAUTION]
> Never expose `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or `GOOGLE_CLIENT_SECRET` in Vercel frontend environment variables or client-side bundles.

---

## 2. Step-by-Step Deployment Guide

### Phase 1: GitHub Setup
1. Verify `.gitignore` excludes `.env`, `node_modules/`, `dist/`, `*.db`, `uploads/`, `generated_reports/`.
2. Commit baseline code:
   ```bash
   git add .
   git commit -m "NIRIKSHAK AI Production Release Candidate"
   ```
3. Push to your institutional GitHub repository:
   ```bash
   git remote add origin https://github.com/buildwithneel/Nirikshak-ai.git
   git push -u origin main

### Phase 2: Supabase Setup (PostgreSQL + Auth + Storage)
1. **Create Supabase Project**:
   - Go to [Supabase Dashboard](https://app.supabase.com) -> **New Project**.
   - Note down:
     - Project URL (`https://<project-ref>.supabase.co`)
     - Anon/Publishable Key
     - Service Role Secret Key (Settings -> API)
     - Database connection string (`postgresql://postgres:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres`)
     - JWT Secret (Settings -> API -> JWT Settings)

2. **Configure Storage Buckets**:
   - Navigate to **Storage** -> **Create new bucket**:
     - `inspection-images`: **Private** (Officer surveillance evidence)
     - `complaint-images`: **Private** (Consumer grievance uploads)
     - `reports`: **Private** (Official statutory inspection PDF reports)

3. **Configure Google OAuth in Supabase**:
   - Navigate to **Authentication** -> **Providers** -> **Google**.
   - Toggle **Enable Google**.
   - Copy the **Authorized Redirect URI** provided by Supabase:
     ```text
     https://<project-ref>.supabase.co/auth/v1/callback
     ```

---

### Phase 3: Google Cloud Platform OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Create **OAuth 2.0 Client ID** -> Application type: **Web application**.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (Development)
   - `https://nirikshak-ai.vercel.app` (Your production Vercel domain)
4. Under **Authorized redirect URIs**, add:
   - `https://<project-ref>.supabase.co/auth/v1/callback` (Copied from Supabase)
5. Copy **Client ID** and **Client Secret** into Supabase Dashboard -> Google Provider settings.

---

### Phase 4: Render Backend Deployment (FastAPI)
1. In [Render Dashboard](https://dashboard.render.com), click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `nirikshak-ai-backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health/live`
4. Set Environment Variables in Render:
   - `ENVIRONMENT` = `production`
   - `SEED_DEMO_DATA` = `false`
   - `DATABASE_URL` = `postgresql://postgres:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres`
   - `SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `<your-service-role-key>`
   - `SUPABASE_JWT_SECRET` = `<your-jwt-secret>`
   - `CORS_ORIGINS` = `https://nirikshak-ai.vercel.app,http://localhost:5173`
5. Deploy Web Service. Note down the assigned URL:
   ```text
   https://nirikshak-ai-backend.onrender.com
   ```

---

### Phase 5: Vercel Frontend Deployment (React / Vite)
1. In [Vercel Dashboard](https://vercel.com), click **Add New** -> **Project**.
2. Import your GitHub repository.
3. Select **Vite** framework preset.
4. Set Environment Variables:
   - `VITE_API_BASE_URL` = `https://nirikshak-ai-backend.onrender.com`
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `<your-anon-publishable-key>`
5. Deploy. Vercel will build the bundle using `npm run build` and deploy to `https://nirikshak-ai.vercel.app`.

---

## 3. Post-Deployment Verification & Smoke Testing

1. **Liveness Check**:
   ```bash
   curl https://nirikshak-ai-backend.onrender.com/api/health/live
   # Expect: {"status": "live", "uptime_seconds": ...}
   ```

2. **Readiness Probe**:
   ```bash
   curl https://nirikshak-ai-backend.onrender.com/api/health/ready
   # Expect: {"status": "ready", "database": "connected", "ocr_engine": "ready", "rule_engine": "ready"}
   ```

3. **Detailed Diagnostics**:
   ```bash
   curl https://nirikshak-ai-backend.onrender.com/api/health/detailed
   ```

4. **Web Portal Smoke Test**:
   - Navigate to `https://nirikshak-ai.vercel.app/login`.
   - Click **Continue with Google** -> Sign in -> Confirm redirected to `/check` with `USER` role.
   - Click **Server Diagnostics** icon in TopHeader -> Verify all subsystem badges show `ONLINE` / `OPERATIONAL`.
   - Upload sample commodity package image -> Confirm OCR detection and statutory rule analysis.

---

## 4. Security & Human-Authority Safeguards

1. **Human Officer Authority**: The AI model detects, explains, and organizes evidence. Final legal determinations remain solely with the authorized human officer.
2. **Untrusted Packaging Evidence**: OCR text from commodity labels is treated as untrusted data wrapped in `<UNTRUSTED_PACKAGE_EVIDENCE>` tags.
3. **Tamper-Evident Audit Chain**: SHA-256 cryptographic linkage is verified via `/api/inspections/{id}/audit/verify`.
4. **Role Isolation**: Default OAuth accounts receive `USER` role. Officer status requires explicit administrator assignment.
