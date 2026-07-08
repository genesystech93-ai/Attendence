# Phase 3: Supabase Sync Integration - Research

## 1. Supabase Client SDK Integration

To communicate with the database, we will use `@supabase/supabase-js`. It must be installed in both our client projects:
- **Desktop:** `npm install @supabase/supabase-js`
- **Mobile:** `npm install @supabase/supabase-js`

The client is initialized using:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 2. Database Schema DDL & Triggers

To set up the backend, the following SQL statements are required:

### A. Core Tables
```sql
CREATE TABLE public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geofence_radius DOUBLE PRECISION NOT NULL,
    allowed_wifi_ssids JSONB NOT NULL
);

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('employee', 'admin')),
    office_id UUID REFERENCES public.offices(id)
);

CREATE TABLE public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out TIMESTAMPTZ,
    check_in_ip TEXT NOT NULL,
    check_in_wifi TEXT NOT NULL,
    check_in_location JSONB,
    status TEXT NOT NULL CHECK (status IN ('present', 'late')),
    duration_minutes INT
);

CREATE TABLE public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sick', 'vacation', 'casual')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT NOT NULL
);
```

### B. Auto-Profile Creation Trigger
When a user signs up through Supabase Auth, we want to copy their metadata into `public.users` automatically:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role, avatar_url)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', 'New Employee'),
        coalesce(new.raw_user_meta_data->>'role', 'employee'),
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 3. Security (Row-Level Security)

Enable RLS on all tables:
```sql
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
```

Policies:
- **`users`**:
  ```sql
  CREATE POLICY "Profiles are viewable by authenticated users" ON public.users
      FOR SELECT TO authenticated USING (true);
      
  CREATE POLICY "Users can update own profile" ON public.users
      FOR UPDATE TO authenticated USING (auth.uid() = id);
  ```
- **`attendance_logs`**:
  ```sql
  CREATE POLICY "Employees can view own logs" ON public.attendance_logs
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
      
  CREATE POLICY "Employees can insert own logs" ON public.attendance_logs
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
      
  CREATE POLICY "Admins can view all logs" ON public.attendance_logs
      FOR SELECT TO authenticated USING (
          EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      );
      
  CREATE POLICY "Admins can update logs" ON public.attendance_logs
      FOR UPDATE TO authenticated USING (
          EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      );
  ```
