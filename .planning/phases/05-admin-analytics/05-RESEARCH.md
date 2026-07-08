# Phase 5: Admin Analytics & Reports - Research

## 1. PostgreSQL RPC Aggregate Query

Instead of downloading thousands of raw logs for the client to compute sums locally, we can declare a stored PostgreSQL procedure (RPC) in Supabase. This dramatically reduces payload sizes and memory consumption on the frontend client.

### SQL RPC Definition
```sql
CREATE OR REPLACE FUNCTION public.get_attendance_summary(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    total_days INT,
    total_late INT,
    total_minutes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.full_name,
        u.email,
        count(a.id)::int as total_days,
        count(CASE WHEN a.status = 'late' THEN 1 END)::int as total_late,
        coalesce(sum(a.duration_minutes), 0)::bigint as total_minutes
    FROM public.users u
    LEFT JOIN public.attendance_logs a ON u.id = a.user_id 
        AND a.check_in >= start_date 
        AND a.check_in <= end_date
    GROUP BY u.id, u.full_name, u.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. Client-Side CSV Serializer

A pure client-side javascript function can convert the JSON array into an Excel-compliant CSV file download, matching our offline design constraint:

```typescript
export function exportToCSV(logs: any[], filename: string) {
  const headers = ['Employee Name', 'Email', 'Check-In', 'Check-Out', 'SSID', 'IP Address', 'Duration (Mins)', 'Status'];
  const rows = logs.map(log => [
    log.userName,
    log.email || '',
    log.checkIn,
    log.checkOut || '',
    log.checkInWifi,
    log.checkInIp,
    log.durationMinutes || 0,
    log.status
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```
