# NIRIKSHAK AI (निरीक्षक AI)

### AI-Assisted Legal Metrology Packaging Compliance & Enforcement Platform

NIRIKSHAK AI is an enterprise-grade, evidence-grounded regulatory technology platform designed to assist authorized enforcement officers and citizens in evaluating packaged commodity compliance under **The Legal Metrology Act, 2009** and **The Legal Metrology (Packaged Commodities) Rules, 2011**.

---

## Key Capabilities

1. **Real-Time OCR & Multi-Panel Evidence Canvas**: RapidOCR / PaddleOCR ONNX engine with interactive bounding boxes, zoom/pan navigation, and quantitative image clarity diagnostics (Laplacian blur, brightness, contrast).
2. **Deterministic Legal Metrology Rule Engine**: Evaluates mandatory declarations under Rule 6(1)(a)-(n), Rule 11, Rule 18, font size requirements, and unit sale price mandates.
3. **Multi-Image Packaging Intelligence**: Aggregates front, back, and side packaging panels, resolving declaration locations and detecting cross-panel conflicts (e.g. dual-MRP, net quantity discrepancies).
4. **Evidence-Grounded AI Inspection Copilot**: Natural-language inspection assistant strictly grounded in active evidence, providing finding explanations, verification checklists, and statutory legal navigation.
5. **Human Officer Authority & Verification**: Enforces physical inspection gates, recording officer observations, statutory action justifications, and human legal determinations.
6. **Tamper-Evident Audit Trail**: Cryptographic SHA-256 hash chaining of all inspection and grievance lifecycle events with verification endpoints.
7. **Statutory PDF Report Generation**: Official inspection dossier with embedded evidence snapshots, officer findings, and cryptographic SHA-256 provenance.
8. **Field Network Resilience & Offline Sync**: Full offline capability with IndexedDB draft storage, connection status indicators, and automatic reconnection synchronization.
9. **Production Cloud Architecture**: GitHub + Supabase (PostgreSQL, Auth, Storage, Google OAuth) + Render (FastAPI) + Vercel (React/Vite).

---

## Core Operational Principle: Human Authority

```text
AI DETECTS
    ↓
AI EXPLAINS
    ↓
AI ORGANIZES EVIDENCE
    ↓
AI SUGGESTS REVIEW STEPS
    ↓
OFFICER INSPECTS
    ↓
OFFICER VERIFIES
    ↓
OFFICER DETERMINES
```

NIRIKSHAK AI operates strictly as an **AI-assisted inspection and evidence-management platform**.
Visual non-detection is labeled `NOT_DETECTED` / "No Reliable Visual Evidence Detected" requiring physical officer inspection; it is never converted into false certainty or legal guilt. The final legal determination remains solely with the authorized human officer.

---

## Production Deployment Architecture

```text
                         USER
                           │
                           ▼
                    ┌──────────────┐
                    │    Vercel    │
                    │ React / Vite │
                    │  Frontend    │
                    └──────┬───────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
      Supabase Auth                Render API
             │                           │
             ▼                           ▼
       Google OAuth                FastAPI Backend
                                         │
                       ┌─────────────────┼─────────────────┐
                       │                 │                 │
                       ▼                 ▼                 ▼
                 Supabase DB       Supabase Storage    OCR/AI
                  PostgreSQL         Images/PDFs       Processing
```

For complete step-by-step instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Local Development Quickstart

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### 1. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run FastAPI backend
python -m uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

### 3. All-in-One Launcher
On Windows, you can launch both backend and frontend with:
```bash
python run.py
```

---

## Automated Verification & Test Suites

NIRIKSHAK AI includes a comprehensive quality gate across all milestone suites:

```bash
# Prompt 8: Core Institutional Workflow Suite (20/20)
python backend/test_prompt8_workflow.py

# Prompt 9: Multi-Image & Intelligence Analytics Suite (20/20)
python backend/test_prompt9_workflow.py

# Prompt 10: Security, Reliability & Provenance Suite (20/20)
python backend/test_prompt10_security_reliability.py

# Prompt 11: AI Inspection Copilot & Evidence Intelligence Suite (22/22)
python backend/test_prompt11_copilot.py

# Master Production Readiness Audit (Holistic Regression)
python backend/test_production_readiness.py

# Production Smoke Test
python backend/test_production_smoke.py

# Frontend TypeScript & Bundle Verification
npm run build
```

---

## Security Policy

- **Rate Limiting**: Sliding-window rate limiter on sensitive endpoints (`/api/auth/login`, `/api/complaints`, `/api/compliance/analyze`, `/api/inspections/{id}/copilot`).
- **Prompt Injection Defense**: Package text is treated as untrusted data wrapped in `<UNTRUSTED_PACKAGE_EVIDENCE>` tags.
- **Image Security**: Magic byte verification (JPEG, PNG, WebP), OpenCV decode validation, and path traversal defense against malicious uploads.
- **Role Isolation**: Google OAuth accounts default strictly to `USER` (consumer) role. Officer privileges require explicit administrative assignment.

---

## Disclaimer

*NIRIKSHAK AI is an automated compliance assistance and evidence collection tool. It does not replace statutory powers or official duties under The Legal Metrology Act, 2009. Official legal actions and determinations require independent physical inspection and verification by authorized Legal Metrology officers.*
