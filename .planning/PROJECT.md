# Attendy Office Attendance System

## What This Is

A lightweight, secure office attendance check-in application featuring desktop (Tauri) and mobile (Expo) clients. The system validates employee physical presence in the office using geofencing coordinates and authorized Wi-Fi SSID network checking.

## Core Value

Ensure precise, tamper-proof employee attendance tracking with minimal operational hosting overhead.

## Requirements

### Validated

- [x] AUTH-01: User session login using email and preset configurations
- [x] ATT-01: Offline check-in/out with real-time shift timers
- [x] ATT-02: Sensor simulation console (SSID, IP, coords) for testing bounds
- [x] ATT-03: Geofence checking using client-side Haversine distance computations
- [x] ATT-04: Admin center config dashboard (update coords, authorized SSIDs)
- [x] LV-01: Leave request submissions and status lists
- [x] MOB-01: Native geolocation GPS integration on Mobile (Expo)
- [x] MOB-02: Native biometric FaceID/TouchID checking on Mobile (Expo)

### Active

- [ ] DB-01: Real-time cloud sync database schema (PostgreSQL)
- [ ] DB-02: Row-Level Security (RLS) policies for data separation
- [ ] DB-03: JWT Authentication via Supabase Auth

### Out of Scope

- [ ] Real-time active chat — Defer to v2+ (secondary feature, high complexity)
- [ ] Video audit attachments — Defer to v2+ (storage size limits)

## Context

- Building a monorepo containing `desktop/` (Tauri + React) and `mobile/` (Expo).
- Current implementations use a robust synchronous in-memory store backed by browser `localStorage` and device `AsyncStorage`.
- Next major step is replacing mock data layers with Supabase client bindings.

## Constraints

- **Tech Stack**: Tauri (Desktop), React Native Expo (Mobile), Supabase (Serverless Backend).
- **Security**: Must prevent timestamp spoofing (e.g. changing local system time).
- **Cost**: Backend must run within Supabase free limits for minimal hosting.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | Significantly smaller binary size (~15MB vs ~100MB) and lower memory footprint | ✓ Good |
| In-memory AsyncStorage sync | Allows synchronous local access on mobile, writing updates in the background | ✓ Good |
| Supabase serverless | Free-tier relational database with built-in JWT and RLS | — Pending |

---
*Last updated: 2026-07-08 after initial project bootstrap*
