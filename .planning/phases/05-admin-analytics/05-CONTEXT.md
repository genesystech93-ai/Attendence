# Phase 5: Admin Analytics & Reports - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Source:** System administration alignment

<domain>
## Phase Boundary

We are implementing analytics and CSV data exporting capabilities for Administrators. Admins need a way to review month-to-date hours, late check-in counts, and download full sheets of raw log events formatted for standard payroll ingestion.

</domain>

<decisions>
## Implementation Decisions

### 1. CSV Data Export
- Expose a "Export CSV" button in the Desktop Admin panel.
- The system will compile all attendance records for the selected month, format them as comma-separated values, and trigger a client-side browser file download.
- Fields in CSV: `Employee Name`, `Email`, `Date`, `Clock-In Time`, `Clock-Out Time`, `Connected SSID`, `IP Address`, `Duration (Hours)`, `Status (On-Time/Late)`.

### 2. SQL Aggregate Analytics
- We will write a PostgreSQL remote procedure call (RPC) or query to aggregate working hours grouped by employee.
- This keeps calculation overhead off the client and returns neat JSON arrays containing summaries.

### Claude's Discretion
- Display active workers count dynamically at the top of the Admin dashboard.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — Active constraints.
- `.planning/phases/03-supabase-sync-integration/03-RESEARCH.md` — DB schemas.

</canonical_refs>

<specifics>
## Specific Ideas

- PostgreSQL RPC function definition for summaries.

</specifics>

<deferred>
## Deferred Ideas

- Direct integration with external HR payroll tools (e.g. ADP, Gusto). Defer to v2.

</deferred>

---
*Phase: 05-admin-analytics*
*Context gathered: 2026-07-08*
