# NIRIKSHAK AI — Institutional Design System Reference (Prompt 6.5)

## 1. Philosophical Direction
* **Character**: Formal, institutional, trustworthy Legal Metrology compliance platform.
* **Blend**: Government & Regulatory Authority + Modern Technology + AI Assistance + Consumer Trust.
* **Target Experience Ratio**: 80% Professional & Serious, 15% Modern & Crisp, 5% Tasteful Delight.

---

## 2. Color Palette & Tokens

| Semantic Role | Token Name | Hex Code | Purpose & Context |
| :--- | :--- | :--- | :--- |
| **App Background** | `institutional.bg` | `#F8FAF9` | Clean, subtle warm-white application canvas |
| **Card / Surface** | `institutional.surface` | `#FFFFFF` | Primary content panels, tables, modals |
| **Secondary Surface** | `institutional.subtle` | `#F1F5F3` | Table headers, muted button backgrounds |
| **Institutional Border** | `institutional.border` | `#DDE5E1` | High-contrast structural dividers (1px) |
| **Primary Brand** | `govgreen.800` | `#166534` | Primary actions, inspection triggers |
| **Deep Green** | `govgreen.900` | `#14532D` | Department headers, authoritative badges |
| **Compliant Tint** | `govgreen.100` | `#DCFCE7` | Stat cards, compliant findings background |
| **Trust Navy** | `govnavy.900` | `#17324D` | Regulatory notices, tech badges, AI signals |
| **Navy Surface** | `govnavy.100` | `#EAF1F7` | Informational callouts and technology panels |
| **Accent Teal** | `govteal.700` | `#0F766E` | Consumer CTAs, scanning triggers, mobile check |
| **Soft Teal** | `govteal.100` | `#CCFBF1` | Consumer check highlight badges |
| **Warning Amber** | `govamber.700` | `#B45309` | Review required, ambiguous declarations |
| **Soft Amber** | `govamber.100` | `#FEF3C7` | Review required background badge |
| **Muted Red** | `govred.700` | `#B42318` | Potential non-compliance, statutory violations |
| **Soft Red** | `govred.100` | `#FEE4E2` | Violation highlight backgrounds |
| **Primary Ink** | `govink.primary` | `#17211B` | High contrast headers, titles, numbers |
| **Secondary Ink** | `govink.secondary` | `#59645D` | Body text, descriptions, labels |
| **Muted Ink** | `govink.muted` | `#7A847E` | Timestamps, metadata, hints |

---

## 3. Typography Scale

* **Page Title**: 24–28px (Mobile), 28–34px (Desktop), Weight: 800/900.
* **Section Title**: 18–20px, Weight: 700.
* **Card Header**: 15–16px, Weight: 700.
* **Body Text**: 14–15px, Leading: 1.5, Weight: 400/500.
* **Metadata / Table**: 12–13px, Weight: 500/600.
* **Technical / Codes**: Font family: `JetBrains Mono, Menlo, monospace`, 11–12px.

---

## 4. 21st.dev-Inspired Motion Curves & Timing

```text
Micro Interaction:     120ms – 160ms (Buttons, checkboxes, tabs)
Standard Transition:   180ms – 260ms (Page enter, drawer reveal, dropdowns)
Major Section Reveal:  280ms – 400ms (Scan sweep, modal reveal, checklist sequence)
Easing Curve:          cubic-bezier(0.16, 1, 0.3, 1) (Snappy, natural, un-exaggerated)
```

* Strict accessibility: When `prefers-reduced-motion: reduce` is active, all animated translations and sweeps are cancelled instantly.

---

## 5. Mobile & Android Specifications

* **Target Viewports Tested**:
  * 360 × 800 (Compact Android)
  * 390 × 844 (Standard Mobile)
  * 412 × 915 (Large Android Pixel / Galaxy)
* **Touch Target**: Minimum 44 × 44px for all buttons, file pickers, navigation tabs, and inputs.
* **Safe Areas**: `safe-bottom: env(safe-area-inset-bottom, 16px)`.
* **Camera Capture**: Explicit options for direct camera capture (`capture="environment"`) and local photo gallery upload.

---

## 6. Two User Experiences

### A. Officer Portal
* Information-dense, formal, evidence-linked.
* Dedicated Visual Evidence Canvas with spatial OCR bounding boxes, statutory clause analysis, officer determination overrides, IndexedDB canonical history, and ReportLab PDF downloads.

### B. Consumer View
* Low cognitive load, friendly, accessible, mobile-first.
* Clear plain-language status: **Found on Package** (✓) vs. **Needs Review** (⚠).
* Direct intake path for **Report a Concern** with email validation, local reference tracking (`CMP-XXXXXXXX`), and responsible legal disclaimers.
