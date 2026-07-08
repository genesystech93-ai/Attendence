---
phase: 3
slug: supabase-sync-integration
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

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

- **After every task commit:** Run `npm run build` in `desktop` and `mobile` directories
- **After every plan wave:** Validate compilation build completes
- **Before `/gsd-verify-work`:** All verification checks must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | AUTH-02 | — | SQL schema loads without syntax errors | SQL Validation | `node -c backend/schema.sql` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | AUTH-02 | — | Desktop app builds with Supabase client integrations | Build check | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] stubs for supabase client connection
- [ ] configure `.env.example` configurations

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Validate Row-Level Security | AUTH-02 | Requires live connection to Supabase database | Try selecting rows from `attendance_logs` using an employee session that belongs to another user; verify it returns 0 rows. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
