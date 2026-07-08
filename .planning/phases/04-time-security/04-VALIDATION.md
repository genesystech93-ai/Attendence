---
phase: 4
slug: time-security
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-08
---

# Phase 4 — Validation Strategy

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

- **After every task commit:** Run build compiler
- **Before `/gsd-verify-work`:** Verification checks must pass

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SEC-02 | — | DB check constraints reject altered timestamps | SQL check | `node -c backend/schema.sql` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | SEC-01 | — | Client queries secure timezone endpoint | unit | `npm run build` | ✅ | ⬜ pending |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Client System Time Spoofing | SEC-01 | Requires modifying device settings | Change your local computer/phone system clock 1 hour forward. Attempt to clock-in. Verify that the app either blocks the check-in due to clock drift detection or logs the correct UTC time fetched from the network timezone API. |
