-- PostgreSQL Database Schema for Konark HR System
-- Production Ready Upgrade v3.1 (Fix Recursion & Clean RLS)

-- 1. SETUP & ENUMS
-- We use pgcrypto only if gen_random_uuid is not available, but usually it is in PG 13+
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('HR', 'SITE_INCHARGE', 'EMPLOYEE');
    CREATE TYPE site_status AS ENUM ('ACTIVE', 'CLOSED');
    CREATE TYPE employee_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
    CREATE TYPE employee_role AS ENUM ('Supervisor', 'Driver', 'Helper', 'Safety Officer', 'Other');
    CREATE TYPE severity_level AS ENUM ('INFO', 'WARN', 'CRITICAL');
    CREATE TYPE notification_type AS ENUM ('INFO', 'ALERT', 'SUCCESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES

-- COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT
);

-- SITES
CREATE TABLE IF NOT EXISTS sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  site_code TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  pincode TEXT,
  email TEXT,
  mobile TEXT,
  manager_name TEXT,
  manager_mobile TEXT,
  status site_status DEFAULT 'ACTIVE',
  logo_url TEXT
);

-- USERS (HR Only - Linked to Supabase Auth)
-- Note: Requires Supabase Auth to be active.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role DEFAULT 'HR' CHECK (role = 'HR'),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL
);

-- EMPLOYEES (Staff - UAN Identity)
CREATE TABLE IF NOT EXISTS employees (
  uan TEXT PRIMARY KEY CHECK (uan ~ '^[0-9]{12}$'), -- Strictly 12 digits
  name TEXT NOT NULL,
  role employee_role NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status employee_status DEFAULT 'PENDING',
  added_by TEXT NOT NULL, -- Stores UAN (Incharge) or UUID (HR)
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- SALARY RECORDS (Raw Components Only)
CREATE TABLE IF NOT EXISTS salary_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_uan TEXT NOT NULL REFERENCES employees(uan) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  basic NUMERIC(10,2) DEFAULT 0.00,
  hra NUMERIC(10,2) DEFAULT 0.00,
  allowances NUMERIC(10,2) DEFAULT 0.00,
  pf_deduction NUMERIC(10,2) DEFAULT 0.00,
  tax_deduction NUMERIC(10,2) DEFAULT 0.00,
  is_locked BOOLEAN DEFAULT FALSE,
  CONSTRAINT salary_uan_month_year_key UNIQUE (employee_uan, month, year)
);

-- SALARY VIEW (Computed Business Logic)
CREATE OR REPLACE VIEW salary_view AS
SELECT 
  sr.*,
  (sr.basic + sr.hra + sr.allowances - sr.pf_deduction - sr.tax_deduction) AS net_salary
FROM salary_records sr;

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id TEXT NOT NULL, -- UUID or UAN
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  severity severity_level DEFAULT 'INFO'
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- UUID or UAN
  message TEXT NOT NULL,
  type notification_type DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- SECURITY POLICIES (RLS)
-- ==========================================

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- CLEANUP: Drop ALL existing policies to prevent recursion/conflicts
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('companies', 'sites', 'users', 'employees', 'salary_records', 'audit_logs', 'notifications') 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename); 
    END LOOP; 
END $$;

-- 1. COMPANIES & SITES
CREATE POLICY "Public Read Companies" ON companies FOR SELECT USING (true);
CREATE POLICY "HR Write Companies" ON companies FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public Read Sites" ON sites FOR SELECT USING (true);
CREATE POLICY "HR Write Sites" ON sites FOR ALL USING (auth.role() = 'authenticated');

-- 2. USERS
CREATE POLICY "Users Read Own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "HR Insert Users" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. EMPLOYEES
CREATE POLICY "Public Read Employees" ON employees FOR SELECT USING (true);
CREATE POLICY "HR Write Employees" ON employees FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Anon Insert Employees" ON employees FOR INSERT WITH CHECK (status = 'PENDING');

-- 4. SALARY RECORDS
CREATE POLICY "Public Read Salary" ON salary_records FOR SELECT USING (true);
CREATE POLICY "HR Write Salary" ON salary_records FOR ALL USING (auth.role() = 'authenticated');

-- 5. AUDIT & NOTIF
CREATE POLICY "Anyone Insert Logs" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "HR Read Logs" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone Insert Notif" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Read Own Notif" ON notifications FOR SELECT USING (true);


-- SEED DATA
INSERT INTO companies (id, client_id, name, logo_url) 
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'KONARK001', 'Konark Enterprises Pvt. Ltd.', 'https://via.placeholder.com/150')
ON CONFLICT DO NOTHING;

INSERT INTO sites (id, company_id, name, site_code, address, city, state, pincode, email, mobile, manager_name, manager_mobile, status) 
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Konark Site - Pune HQ', 'KE-PUN-01', 'Plot No. 45/B, Rajiv Gandhi Infotech Park', 'Pune', 'Maharashtra', '411057', 'pune.admin@konark.com', '+91 98765 43210', 'Amit Sharma', '+91 99988 87776', 'ACTIVE')
ON CONFLICT DO NOTHING;
