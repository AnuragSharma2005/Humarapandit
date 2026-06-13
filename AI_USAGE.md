# AI Usage & Collaboration Declaration - Astrologer CRM

This document declares the use of AI assistant tools (DeepMind's Antigravity AI pair programmer) and details the specific engineering tasks, architectures, and refactoring guidelines established through human-AI collaboration on the **Astrologer CRM** project.

---

## AI Tools & Models Utilized

During the development, refactoring, and debugging of the **Astrologer CRM** project, the following AI systems and models were actively utilized:

* **Antigravity AI (Pair Programming & Code Generation):** Used for core architecture implementation, frontend responsive layout redesigns, and backend API routing. Within Antigravity, **Gemini** and **Claude** models were leveraged for code generation, structuring page layouts, and configuring CORS/environment settings.
* **Code Diagnostics & Debugging:** **GitHub Copilot** and **ChatGPT** were used as supplementary tools for debugging error logs, diagnosing runtime exceptions, and optimizing code blocks.

---


## 1. Scope of AI Involvement & Accomplished Milestones

AI coding assistants were actively used across the lifecycle of the application to execute the following core integrations:

### A. Backend Route & Logic Migration
- **Files Created**:
  - [astrologyRoutes.js](file:///c:/Users/adity/Downloads/AstrologyCRM/backend/routes/astrologyRoutes.js): Defines POST endpoints for birth chart calculations.
  - [astrologyController.js](file:///c:/Users/adity/Downloads/AstrologyCRM/backend/controllers/astrologyController.js): Implemented geocoding, timezone lookup, VedicAstroAPI queries, and fallback local calculations.
- **Files Modified**:
  - [index.js](file:///c:/Users/adity/Downloads/AstrologyCRM/backend/index.js): Imported and mounted the astrology routes under `/api/astrology`.

### B. Frontend Restructuring
- **Files Modified**:
  - [astrologyApi.ts](file:///c:/Users/adity/Downloads/AstrologyCRM/src/lib/astrologyApi.ts): Removed all client-side Nominatim and TimeAPI network calls. Rewrote the core `fetchBirthChart` adapter to send requests directly to `/api/astrology/chart` on the backend, preserving strict TypeScript types.

### C. Database Synchronization & Ledger Reconciliation
- **Files Modified**:
  - [syncController.js](file:///c:/Users/adity/Downloads/AstrologyCRM/backend/controllers/syncController.js): Implemented an immutable-fields sanitizer (`cleanUpdateData`) to strip system variables (`_id`, `__v`) before database bulk upserts.
  - [Payments.tsx](file:///c:/Users/adity/Downloads/AstrologyCRM/src/pages/client/Payments.tsx): Configured automatic reconciliation between invoice status updates and appointment entries in MongoDB.

---

## 2. Key Architecture Decisions Guided by AI Collaboration

### A. CORS Block & TimeAPI Sandbox Resolution
- **Problem**: The browser blocked requests to `timeapi.io` due to CORS constraints (lack of `Access-Control-Allow-Origin` headers).
- **AI Solution**: Moved the coordinate geocoding and timezone lookups to the Node.js Express backend. Since CORS is a browser sandbox policy, server-to-server fetches remain unaffected, resolving all console exceptions.

### B. VITE_ASTROLOGY_API_KEY Protection
- **Problem**: Storing API keys on the frontend client (`import.meta.env`) exposes them to public inspect tools.
- **AI Solution**: Cached the API keys in backend server configuration variables. The client only interacts with the `/api/astrology/chart` endpoint, keeping credentials secure on the backend.

### C. Local Astronomical Keplerian Fallback Integration
- **Problem**: The user's VedicAstroAPI key was exhausted (402 response code), causing the birth chart reveal page to fail.
- **AI Solution**: Ported the high-fidelity Keplerian orbital calculation engine (incorporating Lahiri Ayanamsa and obliqity adjustments) from client-side script coordinates to the backend controller. The server automatically falls back to this engine if third-party calculations fail.

---

## 3. The Quality Assurance & Verification Pipeline

All changes underwent a multi-step verification pipeline:

1. **Static Analysis & Type Checking**:
   Ran the TypeScript compiler check to ensure frontend components compile correctly:
   ```powershell
   npx tsc --noEmit
   ```
2. **REST API Assertion**:
   Used PowerShell Rest clients to test the backend astrology route, confirming coordinate lookups and local calculation formats:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/astrology/chart" -Method Post -Body $payload
   ```
3. **Browser Automation Validation**:
   Employed browser subagents to fill out form fields (Name, Date, Time, Place of Birth), click "Reveal My Birth Chart", and inspect the console logs to confirm that all `undefined` values were eliminated and the inline SVG chart rendered correctly.
