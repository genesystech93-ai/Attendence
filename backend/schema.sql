-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Offices Table
CREATE TABLE public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geofence_radius DOUBLE PRECISION NOT NULL, -- in meters
    allowed_wifi_ssids JSONB NOT NULL, -- array of strings: ["SSID1", "SSID2"]
    shift_start_time TIME NOT NULL DEFAULT '09:30:00',
    shift_end_time TIME NOT NULL DEFAULT '18:30:00',
    holidays JSONB NOT NULL DEFAULT '[]'::jsonb -- array of date strings: ["2026-12-25"]
);

-- 2. Create Users (Profiles) Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL
);

-- 3. Create Attendance Logs Table
CREATE TABLE public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out TIMESTAMPTZ,
    check_in_ip TEXT NOT NULL,
    check_in_wifi TEXT NOT NULL,
    check_in_location JSONB, -- { "lat": double, "lng": double }
    status TEXT NOT NULL CHECK (status IN ('present', 'late')),
    duration_minutes INT,
    -- TIME SECURITY: Ensure check_in timestamp is within 30 seconds of
    -- the database server's transaction time (prevents client clock spoofing)
    CONSTRAINT check_in_server_time_bound
        CHECK (check_in >= now() - interval '30 seconds' AND check_in <= now() + interval '30 seconds')
);

-- TIME SECURITY: Trigger to validate check_out timestamp on update
CREATE OR REPLACE FUNCTION public.validate_checkout_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure check_out is within 30 seconds of the server's current time
    IF NEW.check_out IS NOT NULL AND OLD.check_out IS NULL THEN
        IF NEW.check_out < now() - interval '30 seconds' OR NEW.check_out > now() + interval '30 seconds' THEN
            RAISE EXCEPTION 'TAMPER_ALERT: check_out timestamp (%) is too far from server time (%)',
                NEW.check_out, now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_checkout_server_time
    BEFORE UPDATE ON public.attendance_logs
    FOR EACH ROW EXECUTE FUNCTION public.validate_checkout_time();


-- 4. Create Leave Requests Table
CREATE TABLE public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sick', 'vacation', 'casual')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT NOT NULL
);

-- 5. Automate User Profile Synchronization from Supabase Auth
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

-- Trigger definition on auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Enable Row-Level Security (RLS) on all Tables
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies

-- Users Profiles Policies
CREATE POLICY "Profiles are viewable by authenticated users" 
    ON public.users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile details" 
    ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Offices Configuration Policies
CREATE POLICY "Offices configurations are viewable by authenticated users" 
    ON public.offices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only Admins can modify office configurations" 
    ON public.offices FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Attendance Logs Policies
CREATE POLICY "Employees can view own attendance logs" 
    ON public.attendance_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Employees can check-in own attendance" 
    ON public.attendance_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" 
    ON public.attendance_logs FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update logs" 
    ON public.attendance_logs FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Leave Requests Policies
CREATE POLICY "Employees can view own leave requests" 
    ON public.leave_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Employees can submit own leave requests" 
    ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all leave requests" 
    ON public.leave_requests FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can approve or reject leave requests" 
    ON public.leave_requests FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- 8. Analytics RPCs
CREATE OR REPLACE FUNCTION public.get_attendance_summary()
RETURNS TABLE (
    total_hours INT,
    late_count INT,
    total_logs INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(duration_minutes), 0)::INT / 60 as total_hours,
        COUNT(*) FILTER (WHERE status = 'late')::INT as late_count,
        COUNT(*)::INT as total_logs
    FROM public.attendance_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

