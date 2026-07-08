# Roadmap: Attendy

## Overview

Attendy is being developed offline-first to validate sensors, mock configurations, and visual dashboards before connecting client applications to a Supabase database instance, setting up network time clock-spoofing security checks, and generating production releases.

## Phases

- [x] **Phase 1: Offline Desktop Application** - Lightweight Tauri app with custom dark glassmorphic styling, sensors simulator, and admin leaves queues.
- [x] **Phase 2: Offline Mobile Application** - React Native Expo app integrating native GPS geolocation distance metrics and FaceID/TouchID checks.
- [ ] **Phase 3: Supabase Sync Integration** - Replace client-side mock services with live Supabase client synchronization, row-level security (RLS), and JWT Auth.
- [ ] **Phase 4: Tamper Prevention & Time Security** - Prevent system clock manipulation using network-independent API times and PostgreSQL transaction time rules.
- [ ] **Phase 5: Admin Analytics & Reports** - Real-time statistics, aggregated employee shifts calculations, and CSV reports generation for payroll.
- [ ] **Phase 6: Production Build & Packaging** - Bundling client applications into release-ready binaries (Windows `.exe` and Android `.apk`).

---

## Phase Details

### Phase 1: Offline Desktop Application
**Goal**: Build a fully functional local-first desktop check-in dashboard.
**Depends on**: Nothing (first phase)
**Requirements**: [AUTH-01, AUTH-03, ATT-01, ATT-02, ATT-03, ATT-04, ATT-05, ADMIN-01, ADMIN-02, ADMIN-03, LEAVE-01]
**Success Criteria**:
  1. User can log in with preset employee profiles.
  2. Checked-in timer tracks shift active seconds.
  3. Simulator lets user spoof SSID/IP/coordinates.
  4. Admin can configure center coordinates and SSIDs.
**Plans**: 3 plans

Plans:
- [x] 01-01: Initialize Tauri desktop skeleton and mock data layer.
- [x] 01-02: Implement dark glassmorphic dashboard with ticking timers.
- [x] 01-03: Implement device sensor simulator and admin console.

---

### Phase 2: Offline Mobile Application
**Goal**: Build a fully functional local-first React Native Expo app.
**Depends on**: Phase 1
**Requirements**: [MOB-01, MOB-02]
**Success Criteria**:
  1. Queries device location API to measure distance from office coords.
  2. Prompts biometrics checks on clock-in.
**Plans**: 2 plans

Plans:
- [x] 02-01: Scaffold Expo mobile app and import dataService layer.
- [x] 02-02: Build mobile checking dashboard with location/biometric integrations.

---

### Phase 3: Supabase Sync Integration
**Goal**: Move database storage from localStorage/AsyncStorage to Supabase cloud.
**Depends on**: Phase 2
**Requirements**: [AUTH-02]
**Success Criteria**:
  1. Schema matching SQL is live on PostgreSQL.
  2. Login authenticates with email password.
  3. Logs and leaves synchronize instantly.
**Plans**: 2 plans

Plans:
- [ ] 03-01: Configure SQL tables, RLS policies, and triggers on Supabase.
- [ ] 03-02: Swap client-side mock database layers with real Supabase queries.

---

### Phase 4: Tamper Prevention & Time Security
**Goal**: Secure checking-in timestamps against local device time manipulations.
**Depends on**: Phase 3
**Requirements**: [SEC-01, SEC-02]
**Success Criteria**:
  1. Local system clock edits do not affect recorded check-in times.
  2. Server database rejects client-supplied timestamps that differ from transaction timestamps.
**Plans**: 1 plan

Plans:
- [ ] 04-01: Implement WorldTimeAPI time queries and SQL row insertion constraints.

---

### Phase 5: Admin Analytics & Reports
**Goal**: Build comprehensive admin control panels and export payroll CSV logs.
**Depends on**: Phase 4
**Requirements**: [ADMIN-04, ADMIN-05]
**Success Criteria**:
  1. Admin dashboard provides charts tracking active workers.
  2. Admin can download monthly shifts logs as Excel-compatible CSVs.
**Plans**: 1 plan

Plans:
- [ ] 05-01: Build stats dashboards and CSV download tools.

---

### Phase 6: Production Build & Packaging
**Goal**: Generate standalone installer executables for clients.
**Depends on**: Phase 5
**Requirements**: [DEP-01, DEP-02]
**Success Criteria**:
  1. Compile Tauri code into a standard Windows `.exe` installer.
  2. Package mobile application into an Android `.apk` binary.
**Plans**: 1 plan

Plans:
- [ ] 06-01: Configure compilation scripts and generate release binaries.

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Offline Desktop | 3/3 | Complete | 2026-07-08 |
| 2. Offline Mobile | 2/2 | Complete | 2026-07-08 |
| 3. Supabase Sync | 0/2 | Not started | - |
| 4. Time Security | 0/1 | Not started | - |
| 5. Admin Analytics | 0/1 | Not started | - |
| 6. Production Build | 0/1 | Not started | - |
