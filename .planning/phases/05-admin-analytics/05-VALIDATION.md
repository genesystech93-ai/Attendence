---
phase: 5
slug: admin-analytics
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-08
---

# Phase 5 — Validation Strategy

Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | desktop/vite.config.ts |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run build check
- **Before `/gsd-verify-work`:** Full suite must pass

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | ADMIN-05 | — | DB RPC query compiles without syntax errors | SQL validation | `node -c backend/schema.sql` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | ADMIN-04 | — | Desktop app builds with CSV serializer modules | Build check | `npm run build` | ✅ | ⬜ pending |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSV Data Ingestion | ADMIN-04 | Involves browser filesystem downloads | Click the 'Export CSV' button on the Admin Dashboard. Open the downloaded file in Microsoft Excel or Google Sheets. Verify all column headers match and cell records align properly. |
