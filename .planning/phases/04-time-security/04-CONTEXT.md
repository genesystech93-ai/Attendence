# Phase 4: Tamper Prevention & Time Security - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Source:** System security alignment

<domain>
## Phase Boundary

We are protecting check-in and check-out timestamps against local device clock tampering. If an employee alters their device's local system time, the application must reject the spoofed punch or log the correct server time instead.

</domain>

<decisions>
## Implementation Decisions

### 1. Client-Side Secure Time Queries
- Instead of using `new Date()`, client applications will query a public network time API (WorldTimeAPI) to retrieve the correct UTC timestamp during the punch-in/out process.
- If the network request fails due to offline states, local time is cached, but the entry is flagged as "offline_timestamp" for admin audit.

### 2. Server-Side PostgreSQL Checks
- We will enforce database check constraints on the `attendance_logs` table.
- The `check_in` column must match the database transaction time (`now()`) within a tight tolerance (e.g., 5 seconds). Any attempt by a client to submit a backdated timestamp will be rejected by the PostgreSQL engine.

### Claude's Discretion
- Provide visual warning banners on the dashboard if the device clock drifts more than 2 minutes from the fetched network time.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — Active security constraints.
- `.planning/phases/03-supabase-sync-integration/03-RESEARCH.md` — Database schemas.

</canonical_refs>

<specifics>
## Specific Ideas

- Check constraint formula: `CHECK (check_in >= now() - interval '10 seconds' AND check_in <= now() + interval '10 seconds')`.

</specifics>

<deferred>
## Deferred Ideas

- Local NTP daemon bindings in Tauri. Defer to v2 (requires Rust crates integration).

</deferred>

---
*Phase: 04-time-security*
*Context gathered: 2026-07-08*
