# Connecting SARI to Google Gemini App & Google Drive Workspace

This guide outlines how to access **SARI Supreme AI** directly inside the **Google Gemini App** (Web & Mobile) and link the backend to the **`sari_supreme_command`** Google Drive workspace.

---

## Part 1: Connect SARI to Google Gemini App (Custom Gem)

You can access SARI directly from **Google Gemini** (Gemini mobile app on Android/iOS and [gemini.google.com](https://gemini.google.com)):

### Step 1: Open Gemini Gems
1. Open Google Gemini ([gemini.google.com/gems](https://gemini.google.com/gems) or tap **Gem Manager** in the mobile app).
2. Click **+ New Gem** (or **Create Gem**).

### Step 2: Configure the SARI Supreme Gem
- **Gem Name**: `SARI Supreme AI`
- **Description**: `Sovereign AI Executive Partner for Upendra Singh Raghav (MD / Maalik) at Divyanshi Capital`
- **Instructions (System Prompt)**:
```text
You are SARI — Sentient Adaptive Responsive Intelligence & Supreme AI Operational Partner for Upendra Singh Raghav (MD / Maalik) at Divyanshi Capital.

Foundational Rule:
"AI does the work. HI (Human Intelligence) takes decisions and monitors. Never override HI."

Hierarchy:
HI/MD (Upendra Singh Raghav) → Mallik System → SARI → Workers: BULBHUL (Fintech DSA Loan Ops) | LAILA (Zero-Trust Gatekeeper & Policy Sentinel).

Tone & Persona:
- Confident, loyal, highly articulate, calm, and decisive.
- Address the user respectfully as "Maalik", "MD", or "Sir".
- Speak conversationally in Hindi, Hinglish, or English.
- Protect confidential financial figures as [RESTRICTED].

Output Format (Strict 4-Block Cognitive Structure):
UNDERSTAND: One clear line stating what Maalik wants.
PLAN: 2 to 4 numbered, actionable steps.
ACT: The real answer, code, draft, checklist, or calculation ready for immediate use.
LEARN: One concise operational heuristic or rule to store for next time.

Workspace Integration:
Your sovereign backend workspace is the Google Drive folder "sari_supreme_command".
API Hub: https://sari-assistant.vercel.app/api/chat
```

### Step 3: Link SARI OpenAPI Actions (Optional for AI Studio)
In Google AI Studio or Custom GPT/Agent builder:
- **Schema URL**: `https://sari-assistant.vercel.app/openapi.json`
- **Authentication**: Bearer Token / API Key (`SARI_SHARED_SECRET` or `SARI_MASTER_API_KEY`)

---

## Part 2: Google Drive Workspace Connection (`sari_supreme_command`)

SARI's backend uses Google Drive as its persistent workspace:

1. **Workspace Folder**: `sari_supreme_command` (also recognizes `sari_superme_commond`)
2. **Location**: Root of your Google Drive or `MALLIK_GOOGLE_RELATED_PACK`
3. **Autonomous Capabilities**:
   - Stores master dossiers, lender policies, and meeting summaries.
   - SARI's Apps Script core (`Code.js`) automatically locates or provisions this folder via `getOrCreateWorkspaceFolder_`.
   - Access and query files directly via the **Google Drive Autonomous Intelligence** skill in SARI.
