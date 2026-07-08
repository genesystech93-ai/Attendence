# Phase 4: Tamper Prevention & Time Security - Research

## 1. Public Time APIs

To fetch network-verified time, client applications can make HTTP GET queries to public JSON endpoints:
- **Primary Endpoint:** `http://worldtimeapi.org/api/timezone/Etc/UTC`
- **Response Format:**
  ```json
  {
    "datetime": "2026-07-08T12:50:00.123456+00:00",
    "unixtime": 1783515000,
    "utc_datetime": "2026-07-08T12:50:00.123456+00:00"
  }
  ```

If the primary endpoint is blocked or throttled, we can fallback to `http://worldclockapi.com/api/json/utc/now`.

---

## 2. Server-side Enforcement (PostgreSQL)

To prevent client SDK inserts from specifying a fake, backdated, or future timestamp, we can configure default values and SQL check constraints in PostgreSQL.

### SQL Constraints Implementation
```sql
-- Ensure check_in cannot be manipulated by client inserts
ALTER TABLE public.attendance_logs
    ALTER COLUMN check_in SET DEFAULT now(),
    ADD CONSTRAINT check_in_time_integrity 
    CHECK (check_in >= TRANSACTION_TIMESTAMP() - interval '10 seconds' 
           AND check_in <= TRANSACTION_TIMESTAMP() + interval '10 seconds');

-- Ensure check_out cannot be set in the future or backdated
ALTER TABLE public.attendance_logs
    ADD CONSTRAINT check_out_time_integrity
    CHECK (check_out IS NULL OR 
          (check_out >= check_in 
           AND check_out <= TRANSACTION_TIMESTAMP() + interval '10 seconds'));
```

*Note: `TRANSACTION_TIMESTAMP()` is equivalent to `now()` but guaranteed to represent the start of the current transaction, preventing any execution latency issues.*
