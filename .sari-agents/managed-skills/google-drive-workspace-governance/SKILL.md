---
name: google-drive-workspace-governance
description: "Safe cloud offloading, Google Drive workspace mounting, and zero-loss large file management protocol"
---

# Google Drive Workspace & Cloud Offloading Governance Protocol

## 1. Authentication & Mount Verification Gate (Non-Negotiable)
- **Zero Token/DB Sniffing:** NEVER read, parse, or print internal DriveFS databases (`root_preference_sqlite.db`, `identifier`, etc.) in `%LOCALAPPDATA%\Google\DriveFS\`.
- **Zero Browser Session Interference:** NEVER automate clicks, inject scripts, or extract cookies from running Chrome or Edge sessions.
- **Read-Only Proof Required:** Drive is considered unauthenticated until:
  - `Get-PSDrive G` confirms the mounted volume, OR
  - An authorized API call (`gws drive about get`) returns HTTP 200 with the confirmed account email (`u.raghav003@gmail.com`).

## 2. Hard Exclusion List (NEVER Move, Delete, or Stub)
- System directories (`C:\Windows\`, `C:\Program Files\`, `C:\ProgramData\`)
- Active repositories and version control (`bulbhul-banking\`, `.git\`, `.omp\`)
- Docker containers and AI model hardlinks (`.docker\models\`)
- Local AI model stores (`.ollama\models\`, `.lmstudio\models\`, Kokoro TTS weights)
- Primary user documents, spreadsheets, and unbacked project files (`.xlsx`, `.docx`, `.pdf`, `.html`, `.ps1`)

## 3. Four-Stage Offloading Lifecycle
1. **Candidate Audit:** Produce a read-only table with full path, exact byte size, file type, and rationale. Present to user.
2. **Explicit User Approval:** Await explicit consent before staging or remote transfer.
3. **Staged Transfer & Integrity Verification:** Upload to designated Drive folder (`Google Drive\My Drive\Offloaded_Archive\`); verify SHA256 checksum and file size against the remote copy.
4. **Reclamation:** Local removal is only permitted AFTER cloud integrity is 100% verified. No fake or speculative local stubs.
