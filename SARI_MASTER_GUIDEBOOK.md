# SARI SUPREME AI — MASTER REFERENCE & ARCHITECTURE GUIDEBOOK
**Classification:** Confidential / Sovereign Enterprise Guidebook  
**Organization:** Divyanshi Capital Pvt Ltd  
**Principal:** Upendra Singh Raghav (MD & CEO / Maalik)  
**Version:** v4.1.0-supreme  

---

## 1. Executive Summary & Architecture Overview
SARI (Sovereign Autonomous Research Intelligence) is Divyanshi Capital's flagship enterprise AI agent and multi-tier routing system. It integrates high-throughput inference (OpenRouter, Gemini, Groq), secure authentication (HttpOnly cookies, HMAC-SHA256 session tokens, TOTP 2FA), autonomous self-healing (`self-heal.ts`), continuous self-learning (`self-learn.ts`), and Google Apps Script synchronization (`Code.js`).

---

## 2. Core Technical Stack & Services
- **Frontend**: React 19, Vite, Tailwind CSS, TypeScript, Lucide Icons.
- **Backend / Serverless**: Vercel Serverless Functions (`/api/chat`, `/api/login`, `/api/session`, `/api/audit`, etc.).
- **Sovereign Backend**: Google Apps Script (`Code.js`) gated by HMAC signature verification (`verifyAuth_`) and multi-model fallback (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).
- **Knowledge & Enterprise Catalog**: 50+ institutional bank fitment matrix, dynamic dossier sync with Google NotebookLM (`1BP62tjji2t2ZhYbAJU7-JgaOYGwUD2Bu`).

---

## 3. Security & Authentication Protocol
- **Login Password**: Simplified universal development mode (`123456`) combined with HMAC session signing (`api/_security.ts`).
- **Zero-Trust Boundaries**: Same-origin checks, rate limiting per client IP, and automatic PII redaction.
- **Environment Isolation**: Secrets (`SARI_SESSION_SECRET`, `SARI_SHARED_SECRET`, API keys) are strictly git-ignored and stored in secure server environments or Apps Script script properties.

---

## 4. Autonomous Self-Healing & Self-Learning
- **Self-Heal (`src/lib/self-heal.ts`)**: Automatically diagnoses HTTP 401, 429, 502/503 errors, network timeouts, and malformed JSON payloads, executing dynamic failover or fallback.
- **Self-Learn (`src/lib/self-learn.ts`)**: Captures user directives ("always/never/remember"), extracts lessons from assistant responses (`LEARN: ...`), and syncs memory with the backend.

---

## 5. Deployment & Verification
- **GitHub Repository**: [uraghav003/sari-assistant](https://github.com/uraghav003/sari-assistant)
- **Live Vercel Application**: [https://sari-assistant.vercel.app](https://sari-assistant.vercel.app)
- **Test Suite**: 31 / 31 unit tests passing (`vitest`), 0 TypeScript errors (`tsc --noEmit`), fully verified via automated browser automation and smoke tests.

*End of SARI Master Guidebook — Maintained by SARI Supreme AI.*
