# SARI Assistant Developer & Operator Guide

Welcome to the **SARI Assistant** repository (`sari-assistant`), powering `sari-assistant.vercel.app`.

---

## 🏗️ Repository Architecture at a Glance

```
sari-assistant/
├── api/                  # Vercel Serverless API Routes (/api/login, /api/chat, etc.)
│   └── _security.ts      # Security primitives, HMAC signing, & comma-separated auth whitelist
├── src/                  # React 19 Frontend SPA (TypeScript + Vite)
│   ├── pages/            # Views: LoginPage, ChatPage, LeadsPage, DashboardPage, etc.
│   └── lib/              # Core clients: auth.ts, agent.ts, storage.ts, brain.ts
├── scripts/              # Automation & secret rotation scripts (.ps1)
└── test/                 # Vitest automated test suite (API contracts & notifications)
```

---

## 🔐 Key Fixes & Design Principles

### 1. Multi-Executive Login (`SARI_LOGIN_EMAIL`)
- **Fix**: Updated `api/_security.ts` (`checkCredentials`) to correctly parse comma-separated whitelist emails (e.g., `u.raghav003@gmail.com, md@divyanshicapital.com`) instead of treating them as a single literal string.
- **Session Security**: Authentication issues an HttpOnly cookie (`sari_session`); no sensitive tokens are stored in `localStorage`.

### 2. Automated Testing
- Run the test suite anytime to verify security and API invariants:
  ```bash
  npm test
  ```

---

## 🤖 Activated Repository Agents & Watchdogs
- **SARI Watchdog Daemon**: Continuous background health monitoring (`sari-watchdog.ps1`) for API services and queues.
- **Autonomous Auto-Healer**: Repairs schema headers, validates environment variables, and auto-syncs connection states.
