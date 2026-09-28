# NIRIKSHAK AI — Production Deployment Manual

## Final Milestone Deployment Architecture: GitHub + Firebase + Cloud PostgreSQL + Render + Vercel


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
         │    Firebase Auth    │               │  Render Web Service│
         │          │          │               │  FastAPI / RapidOCR│
         │    Google Sign-In   │               └──────────┬─────────┘
         └─────────────────────┘                          │
                                        ┌─────────────────┼─────────────────┐
                                        ▼                 ▼                 ▼
                                  PostgreSQL DB    Firebase Storage      PaddleOCR
                                   Cloud SQL         Images & PDFs      ONNX Engine


## 1. Environment Variable Reference Matrix

| Variable Name | Purpose | Target Service | Required | Classification |
| :--- | :--- | :--- | :---: | :--- |
| `ENVIRONMENT` | Operational mode (`production`, `development`) | Render | Yes | Server Config |
| `PORT` | Dynamic listening port assigned by hosting platform | Render | Auto | Server Config |
| `DATABASE_URL` | PostgreSQL connection URI for Cloud Database | Render | Yes | **Backend Secret** |
| `SEED_DEMO_DATA` | Prevent automatic demo seeding in production (`false`) | Render | Yes | Server Config |
| `FIREBASE_PROJECT_ID` | Firebase Project ID for backend ID token verification | Render | Yes | Backend Config |
| `FIREBASE_STORAGE_BUCKET`| Firebase Cloud Storage bucket name | Render | Yes | Server Config |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Single-line JSON or path to GCP service account | Render | Optional | **Critical Secret** |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | Render | Yes | Server Config |
| `JWT_SECRET_KEY` | Fallback internal JWT signing key | Render | Yes | **Backend Secret** |
| `VITE_API_BASE_URL` | Render Web Service URL (e.g. `https://nirikshak-api.onrender.com`) | Vercel | Yes | **Frontend Public** |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Vercel | Yes | **Frontend Public** |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain (`<project-id>.firebaseapp.com`) | Vercel | Yes | **Frontend Public** |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Vercel | Yes | **Frontend Public** |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Vercel | Yes | **Frontend Public** |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | Vercel | Yes | **Frontend Public** |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | Vercel | Yes | **Frontend Public** |

> [!CAUTION]
> Never expose `FIREBASE_SERVICE_ACCOUNT_JSON`, `DATABASE_URL`, or `JWT_SECRET_KEY` in Vercel frontend environment variables or client-side bundles.

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
   ```

### Phase 2: Firebase Setup (Auth + Storage)
1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/) -> **Add Project**.
   - Create or select your Google Cloud project.

2. **Enable Authentication**:
   - Navigate to **Authentication** -> **Sign-in method**.
   - Enable **Email/Password**.
   - Enable **Google** provider (select support email and save).

3. **Enable Cloud Storage**:
   - Navigate to **Storage** -> **Get Started**.
   - Create your default storage bucket.
   - Note down the bucket name (e.g., `<project-id>.firebasestorage.app` or `<project-id>.appspot.com`).

4. **Register Web App**:
   - Go to **Project Settings** -> **General** -> **Your apps** -> **Add app** (Web `</>`).
   - Copy the `firebaseConfig` object values:
     - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.

5. **(Optional) Service Account for Backend Storage**:
   - Navigate to **Project Settings** -> **Service accounts** -> **Generate new private key**.
   - Store the JSON content in `FIREBASE_SERVICE_ACCOUNT_JSON` in Render.

---

### Phase 3: Cloud PostgreSQL Database
1. Set up a PostgreSQL 15+ database (e.g. Neon, Supabase PostgreSQL, AWS RDS, or Render PostgreSQL).
2. Obtain connection string:
   ```text
   postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB-NAME]
   ```

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
   - `DATABASE_URL` = `postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB-NAME]`
   - `FIREBASE_PROJECT_ID` = `<your-firebase-project-id>`
   - `FIREBASE_STORAGE_BUCKET` = `<your-firebase-storage-bucket>`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = `<single-line-service-account-json>` (optional)
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
   - `VITE_FIREBASE_API_KEY` = `<your-api-key>`
   - `VITE_FIREBASE_AUTH_DOMAIN` = `<your-auth-domain>`
   - `VITE_FIREBASE_PROJECT_ID` = `<your-project-id>`
   - `VITE_FIREBASE_STORAGE_BUCKET` = `<your-storage-bucket>`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` = `<your-messaging-sender-id>`
   - `VITE_FIREBASE_APP_ID` = `<your-app-id>`
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
