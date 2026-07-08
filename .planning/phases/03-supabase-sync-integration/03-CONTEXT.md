# Phase 3: Supabase Sync Integration - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Source:** System alignment

<domain>
## Phase Boundary

We are replacing the client-side mock services layer in both the Desktop (Tauri) and Mobile (Expo) applications with real Supabase integrations. This requires setting up the Supabase database schema, Row-Level Security (RLS), and JWT Auth.

</domain>

<decisions>
## Implementation Decisions

### 1. Database Schema
We will create four core tables inside the `public` schema of Supabase:
- `users`: Maps to `auth.users` records.
- `offices`: Tracks physical location parameters and boundaries.
- `attendance_logs`: Stores check-in/out timestamps and sensor readings.
- `leave_requests`: Stores employee leave requests.

### 2. Row-Level Security (RLS)
We will define strict Postgres RLS rules:
- **`users`**: Any authenticated user can read profiles. A user can only update their own profile.
- **`attendance_logs`**: Employees can select and insert only their own logs (where `user_id = auth.uid()`). Admins can read and update all logs.
- **`leave_requests`**: Employees can select and insert only their own leave requests. Admins can read and update all requests.
- **`offices`**: Any authenticated user can read office configurations. Only Admins can insert/update configs.

### 3. Database Trigger (Auto-Profile)
- A trigger on `auth.users` will automatically insert a matching profile record into `public.users` upon signup, utilizing the user's metadata for `full_name`.

### 4. Client Bindings
- We will replace `dataService.ts` in both `desktop/src/services/` and `mobile/src/services/` with a Supabase client version using `@supabase/supabase-js`.
- Session state will utilize standard Supabase session handlers.

### Claude's Discretion
- Local fallback caching: If the network is temporarily offline, the app should show a friendly notice.
- SQL scripts will be gathered in a single SQL file (`backend/schema.sql`) for easy execution in the Supabase SQL editor.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**
- `.planning/PROJECT.md` — Core requirements and active constraints.
- `.planning/REQUIREMENTS.md` — List of all requirements.
- `.planning/ROADMAP.md` — Milestone timelines.

</canonical_refs>

<specifics>
## Specific Ideas

- Check-out should compute duration in minutes before updating.
- Geofence radius checks should remain client-side (Tauri / Expo Location API) before submitting to Supabase to prevent useless network traffic.

</specifics>

<deferred>
## Deferred Ideas

- Biometric cryptographic key signature verification on the server. Defer to v2 (requires native iOS/Android cryptography bindings).

</deferred>

---
*Phase: 03-supabase-sync-integration*
*Context gathered: 2026-07-08*
