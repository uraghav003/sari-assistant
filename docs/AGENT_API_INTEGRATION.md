# SARI Supreme Command — Multi-Agent API Key Integration Guide

This guide details how to connect external sovereign agents (**BULBHUL**, **LAILA**, **BHISM**, **POSTMASTER**, **MALLIK**) and custom client apps into SARI's central **Supreme Command** intelligence hub via secure API keys and webhook endpoints.

---

## 1. Central API Authentication Hub

SARI exposes universal secure endpoints on Vercel Edge Serverless:
- **Base URL**: `https://sari-assistant.vercel.app`
- **Primary Chat Hub**: `/api/chat` (Requires session cookie or Bearer API key)
- **Universal Agent Webhook**: `/api/webhook` (Requires `Authorization: Bearer <SARI_SHARED_SECRET>` or `SARI_MASTER_API_KEY`)
- **System Health Probe**: `/api/health`

---

## 2. Connecting Sovereign Agents via API Key (`/api/webhook`)

Every worker agent (BULBHUL, LAILA, BHISM, POSTMASTER, MALLIK) syncs tasks, telemetry, and learning logs to SARI using an authenticated POST request to `/api/webhook`.

### Example cURL Request (Agent Telemetry Sync):
```bash
curl -X POST https://sari-assistant.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SARI_SHARED_SECRET" \
  -d '{
    "agent": "BULBHUL",
    "event": "loan_disbursed",
    "payload": {
      "caseId": "DC-2026-9081",
      "borrower": "[RESTRICTED]",
      "lender": "HDFC Bank",
      "amount": "1500000",
      "status": "DISBURSED"
    }
  }'
```

### Expected JSON Response (200 OK):
```json
{
  "ok": true,
  "supreme": "SARI_SUPREME_COMMAND",
  "agent": "BULBHUL",
  "event": "loan_disbursed",
  "synced": true,
  "timestamp": "2026-11-02T00:10:00.000Z"
}
```

---

## 3. Worker Agent Registration Matrix

| Agent Name | Primary Domain / Scope | Authentication Method | Target Endpoint |
| :--- | :--- | :--- | :--- |
| **SARI** | Master Coordinator & Virtual AI Assistant | Session Cookie / Bearer Key | `/api/chat` |
| **BULBHUL** | Fintech DSA Loan Underwriting & Fitment | Bearer Key (`SARI_SHARED_SECRET`) | `/api/webhook` |
| **LAILA** | Zero-Trust Gatekeeper & Policy Audit | Bearer Key (`SARI_SHARED_SECRET`) | `/api/webhook` |
| **BHISM** | Telephony Calling Desk & Dialer Dispositions | Bearer Key (`SARI_SHARED_SECRET`) | `/api/webhook` |
| **POSTMASTER** | Omnichannel Notifications (WhatsApp/Gmail) | Bearer Key (`SARI_SHARED_SECRET`) | `/api/webhook` |
| **MALLIK** | Sovereign Build Engine & AI Factory | Bearer Key (`SARI_SHARED_SECRET`) | `/api/webhook` |
