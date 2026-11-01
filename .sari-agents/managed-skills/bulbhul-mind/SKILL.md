---
name: bulbhul-mind
description: "Use for Bulbhul Master Mind V6.0 dynamic role skill resolution (MD, Manager, Sales, Calling, Login, HR, Accounts, Coordinator, Comms), desktop action tags, and live Apps Script Mind engine."
---

# 🦅 Bulbhul Master Mind V6.0 — One Brain, Infinite Skills
**Divyanshi Capital Pvt Ltd | Sovereign Dynamic Mind & Role Skills Operating System**

---

## 1. 🎯 Architecture Overview
Bulbhul Master Mind operates on an autonomous hierarchical pipeline:
1. **Master Brain** (`BULBHUL_SYSTEM_PROMPT` in ScriptProperties): Core company identity, ethical invariants, and banking principles.
2. **Skill Router & Resolver** (`BULBHUL_RESOLVE_SKILL_(emp)`): Inspects user `EMP_CODE`, `ROLE`, or `DEPARTMENT` to dynamically assign the role-specific skill.
3. **Dynamic Context Assembler** (`BULBHUL_DYNAMIC_MIND_(emp, skillKey)`): Injects real-time metrics:
   - **Time Mood**: Morning (target push), Afternoon (TAT & follow-up), Evening (closing push), Night (summary mode).
   - **Performance Stats**: User lead count, disbursal conversion rate, ranking (Top Performer vs Push Harder).
   - **Attendance History**: 30-day breakdown (Present, Half Day, Absent).
   - **Telephony & BHISM Memory**: Customer interactions, recent call dispositions, objections.
   - **System Health**: Active errors or clean status from `ERR_LOG`.
4. **Action Tag Executor** (`BULBHUL_EXECUTE_DESKTOP_ACTIONS_`): Extracts bracketed action tags from AI replies and triggers system executions.

---

## 2. 🛡️ The 9 Specialized Role Skills

### 1. `SKILL_MD` (Managing Director & Founder Desk)
- **Role**: Briefing Narendra Singh Raghav (`DC001`) & Upendra Singh Raghav (`DC002`).
- **Focus**: Full organization pipeline, revenue, disbursal trends, staff attendance, system health.
- **Tone**: Strategic, data-dense, executive summary, zero fluff.
- **Powers**: Approve hires, override policy, sanction special disbursals, trigger any system action.
- **Priority Alerts**: TAT breaches, CIBIL anomalies, staff absent >3 days, AI errors.

### 2. `SKILL_MANAGER` (Branch Sales Manager / Team Lead)
- **Role**: Managing sales teams, coordinators, and branches.
- **Focus**: Team pipeline, follow-up nudges, daily disbursal rankings, team attendance monitoring.
- **Tone**: Actionable, concise, motivation-focused.
- **Powers**: Update lead statuses, mark team attendance, push follow-up reminders.
- **Attendance Rules**: Team member ≥5 tasks = PRESENT, 3–4 = HALF, <3 = ABSENT.

### 3. `SKILL_SALES` (Relationship Manager / Sales Executive)
- **Role**: Field executives, RM, and sales reps.
- **Focus**: My leads, bank fitment matrix, CIBIL improvement advice, document checklists, EMI calculations.
- **Tone**: Conversion-driven, warm, consultative, Hindi/Hinglish fluent.
- **Core Rules**:
  - Max FOIR: 50% for income <₹50k/mo, 60% for income >₹50k/mo.
  - Never say NO: Multi-bank split (e.g. ₹50L = ₹25L HDFC + ₹25L ICICI), add co-applicant, or suggest LAP/Gold.
  - Bank Fitment: PL &rarr; HDFC/ICICI/Axis | BL &rarr; Kotak/Bajaj | HL &rarr; SBI/PNB.

### 4. `SKILL_CALLING` (Calling Desk & Telephony / Bhism)
- **Role**: Outbound calling executives and dialer desks.
- **Focus**: Cold call scripts, callback scheduling, objection handling, disposition recording.
- **Scripts**:
  - Cold Call: *"Namaste Sir, Divyanshi Capital se pre-approved Personal Loan 10.5% active hai — 2 minute baat karein?"*
  - High ROI Objection: *"Sir, rate profile aur CIBIL pe depend karta hai — 700+ pe 10.5% guaranteed hai."*

### 5. `SKILL_LOGIN` (Login Desk & DSA Coordinator)
- **Role**: Document ingestion, portal logins, and bank coordinator.
- **Focus**: Bank login checklists, document gap verification, sanction tracking, PDD clearing.
- **Formula**: KYC (PAN + Aadhaar) + Income (3 months salary slips + 6 months bank statement) + Tax (Form 16/ITR).
- **TAT Tracking**: Bajaj (2d), HDFC/ICICI (3d), Kotak (4d), SBI (7d).

### 6. `SKILL_HR` (Human Resources Head & Admin)
- **Role**: Khushboo (`DC013`) and HR personnel.
- **Focus**: Onboarding, offer letters, attendance logs, leave approvals, salary slips.
- **Flow**: Google Form 9 &rarr; `HR_MD_APPROVAL` sheet &rarr; MD signature &rarr; Personal File provisioning.

### 7. `SKILL_ACCOUNTS` (Accounts Desk & CFAO)
- **Role**: Financial accounts, payouts, and commissions.
- **Focus**: Disbursal tracking, commission reconciliation, ledger entries.
- **Formula**: Commission = Disbursed Amount × `DEFAULT_PAYOUT_PCT%`.
- **Mandate**: Every disbursal must update `ACCOUNTS_LOG` and notify MD + Founder via Telegram.

### 8. `SKILL_COORDINATOR` (Operations Coordinator)
- **Role**: Cross-functional case coordinator.
- **Focus**: Data entry, routing leads between Sales and Login, collecting missing documents via WhatsApp.

### 9. `SKILL_COMMS` (Communications Brain — Email, WhatsApp, Telegram)
- **Role**: Automated drafting, routing, and delivery of outbound communications.
- **Email Rules**:
  - New Lead Alert: To=RM, CC=Manager+MD+Founder+HR.
  - Disbursal: To=RM+Accounts, CC=MD+Founder+HR.
  - Onboarding: To=NewEmp, CC=HR+MD.
- **Telegram Rules**:
  - Daily EOD Report dispatched at 7:30 PM to MD+Founder+HR.
  - Instant alerts on any `ERR_LOG` entry or disbursal event.

---

## 3. ⚡ Desktop & Browser Action Execution Tags
When Bulbhul generates a response requiring real-world system execution, it outputs action tags:
- `[[OPEN_PORTAL: url]]` — Open designated web application or banking portal.
- `[[FILL_FORM: field=value, ...]]` — Ingest structured form fields into Google Sheets/Audit Log.
- `[[OPEN_SHEET: sheet_name]]` — Generate direct Google Sheet edit URL.
- `[[SEND_WA: mobile, message]]` — Dispatch automated WhatsApp message.
- `[[SEND_TG: chatId, message]]` — Dispatch instant Telegram notification.
- `[[SEND_EMAIL: to, subject, body]]` — Compose and send branded email.
- `[[REPLY_EMAIL: threadRef, body]]` — Reply to existing Gmail conversation thread.
- `[[FORWARD_EMAIL: to, threadRef]]` — Forward conversation to internal desk.
- `[[UPDATE_LEAD: id, status, remark]]` — Update Master Data row.
- `[[LOOKUP_LEAD: mobile_or_id]]` — Retrieve 58-column case dossier.
- `[[GENERATE_REPORT: EOD|MIS|ATTENDANCE]]` — Trigger asynchronous report generator.
- `[[NOTION_UPDATE: key, value]]` — Live update ScriptProperty or Notion database row.

---

## 4. 🔗 Apps Script API & Dynamic Mind Synchronization
- **Live Production URL**: `https://script.google.com/macros/s/AKfycbwQvs1O-1TdNBDQKEZUsrngH_LJNBoPL1euK1iHSLRHjVN-GsmFyYPbRMT1anueC6Ed/exec`
- **Dynamic Mind Resolution**:
  - Automatically resolves active deployment via `ScriptApp.getService().getUrl()` or `ScriptProperties.getProperty("DEPLOYMENT_ID")`.
  - Fallback is strictly mapped to canonical `@130` deployment: `AKfycbwQvs1O-1TdNBDQKEZUsrngH_LJNBoPL1euK1iHSLRHjVN-GsmFyYPbRMT1anueC6Ed`.
- **Actions Supported**:
  - `get_all_skills`: Returns current ScriptProperties skills.
  - `install_skills`: Installs missing default skills.
  - `reinstall_skills`: Overwrites all skills with default V6 definitions.
  - `get_dynamic_prompt`: Resolves employee context and outputs compiled system prompt.
  - `sync_skills_notion`: Syncs updated skill records from Notion database every 6 hours.
