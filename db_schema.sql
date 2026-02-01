-- PostgreSQL Database Schema for Konark HR System
-- Production Ready Upgrade v3.5 (Schema Cleanup & RPC Fix)

-- 1. SETUP & ENUMS
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

-- USERS (Custom Auth Support)
-- Note: Modified to support RPC login as requested. 
-- In strict production, prefer auth.users, but this table now supports the specific RPC logic requested.
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Renamed from password_hash
  name TEXT NOT NULL,
  role user_role DEFAULT 'HR' CHECK (role = 'HR'),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL
);

-- EMPLOYEES (Staff - UAN Identity)
CREATE TABLE IF NOT EXISTS employees (
  uan TEXT PRIMARY KEY CHECK (uan ~ '^[0-9]{12}$'),
  name TEXT NOT NULL,
  role employee_role NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status employee_status DEFAULT 'PENDING',
  added_by TEXT NOT NULL,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- SALARY RECORDS
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

-- SALARY VIEW
CREATE OR REPLACE VIEW salary_view AS
SELECT 
  sr.*,
  (sr.basic + sr.hra + sr.allowances - sr.pf_deduction - sr.tax_deduction) AS net_salary
FROM salary_records sr;

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  severity severity_level DEFAULT 'INFO'
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- STORAGE SETUP
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true) 
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 3. STORED PROCEDURES (RPC)
-- ==========================================

-- Verify HR Login (Requested Feature)
CREATE OR REPLACE FUNCTION verify_hr_login(p_email TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  role user_role,
  company_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Returns user details ONLY if email matches and password matches
  RETURN QUERY
  SELECT u.id, u.name, u.role, u.company_id
  FROM users u
  WHERE u.email = p_email 
  AND u.password = p_password; -- Use 'password' column (renamed from password_hash)
END;
$$;

-- ==========================================
-- 4. SECURITY POLICIES (RLS)
-- ==========================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "HR Write Companies" ON companies FOR ALL USING (true); -- Simplified for custom auth

CREATE POLICY "Public Read Sites" ON sites FOR SELECT USING (true);
CREATE POLICY "HR Write Sites" ON sites FOR ALL USING (true);

-- 2. USERS
CREATE POLICY "Public Read Users" ON users FOR SELECT USING (true);
CREATE POLICY "HR Write Users" ON users FOR ALL USING (true);

-- 3. EMPLOYEES
CREATE POLICY "Public Read Employees" ON employees FOR SELECT USING (true);
CREATE POLICY "HR Write Employees" ON employees FOR ALL USING (true);

-- 4. SALARY RECORDS
CREATE POLICY "Public Read Salary" ON salary_records FOR SELECT USING (true);
CREATE POLICY "HR Write Salary" ON salary_records FOR ALL USING (true);

-- 5. AUDIT & NOTIF
CREATE POLICY "Public All Logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Public All Notif" ON notifications FOR ALL USING (true);

-- 6. STORAGE
CREATE POLICY "Public Access Assets" ON storage.objects FOR SELECT USING ( bucket_id = 'app-assets' );
CREATE POLICY "Public Upload Assets" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'app-assets' );

-- SEED DATA
INSERT INTO companies (id, client_id, name, logo_url) 
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'KONARK001', 'Konark Enterprises Pvt. Ltd.', 'https://via.placeholder.com/150')
ON CONFLICT DO NOTHING;

-- Seed Admin User for RPC Login
INSERT INTO users (id, email, password, name, role, company_id)
VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 
  'admin@konark.com', 
  'Hr@12345', 
  'System Admin', 
  'HR', 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
) ON CONFLICT (email) DO UPDATE SET password = 'Hr@12345';