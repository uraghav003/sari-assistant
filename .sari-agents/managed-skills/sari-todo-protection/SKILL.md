---
name: sari-todo-protection
description: "SARI todo-driven protection, defensive task orchestration, and automated vulnerability hardening."
---

# SARI Todo-Driven Protection & Threat Defense

Use this skill whenever managing task lists, TODO execution queues, or automated workflows to ensure proactive threat defense and vulnerability hardening.

## Core Principles

1. **Defensive Todo Orchestration**:
   - Every implementation plan or multi-step todo list must include explicit validation, linting, and security audit phases.
   - Never skip security gates (such as input sanitization, token verification, and RBAC enforcement) under scope or timeline pressure.

2. **Automated Self-Healing & Protection**:
   - Monitor system logs, backends, and MCP tool responses for anomalies, HTTP 401/403 failures, or unauthorized execution attempts.
   - Automatically trigger defensive remediation (e.g. circuit breaking, token revocation, or locking compromised triggers) when anomalies are detected.

3. **Audit Trail Compliance**:
   - Record all security-sensitive actions and automated healing events in the immutable SQLite audit ledger (`laila_audit_trail` / `autopilot_tasks`).
