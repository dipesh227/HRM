-- PostgreSQL Database Schema for Konark HR System
-- Specification Implementation v5.0 (Added Dynamic Job Roles)

-- 1. SETUP & ENUMS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('HR', 'SITE_INCHARGE', 'EMPLOYEE');
    CREATE TYPE site_status AS ENUM ('ACTIVE', 'CLOSED');
    CREATE TYPE employee_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
    -- employee_role enum removed in favor of dynamic job_roles table, but types logic handled in app
    CREATE TYPE severity_level AS ENUM ('INFO', 'WARN', 'CRITICAL');
    CREATE TYPE notification_type AS ENUM ('INFO', 'ALERT', 'SUCCESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES

-- COMPANIES (Module 1)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  signature_url TEXT, 
  stamp_url TEXT,     
  email TEXT,
  mobile TEXT,
  address TEXT
);

-- JOB ROLES (New Module for Dynamic Roles)
CREATE TABLE IF NOT EXISTS job_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SITES (Module 2)
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

-- USERS (HR Identity)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role DEFAULT 'HR' CHECK (role = 'HR'),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL
);

-- EMPLOYEES (Staff Identity & Module 3/4)
CREATE TABLE IF NOT EXISTS employees (
  uan TEXT PRIMARY KEY CHECK (uan ~ '^[0-9]{12}$'),
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- Changed from ENUM to TEXT to support dynamic roles
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status employee_status DEFAULT 'PENDING',
  added_by TEXT NOT NULL,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- SALARY RECORDS (Module 5)
CREATE TABLE IF NOT EXISTS salary_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_uan TEXT NOT NULL REFERENCES employees(uan) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  basic NUMERIC(10,2) DEFAULT 0.00,
  hra NUMERIC(10,2) DEFAULT 0.00,
  allowances NUMERIC(10,2) DEFAULT 0.00,
  pf_deduction NUMERIC(10,2) DEFAULT 0.00,
  tax_deduction NUMERIC(10,2) DEFAULT 0.00,
  net_salary NUMERIC(10,2) GENERATED ALWAYS AS (basic + hra + allowances - pf_deduction - tax_deduction) STORED,
  is_locked BOOLEAN DEFAULT FALSE,
  CONSTRAINT salary_uan_month_year_site_key UNIQUE (employee_uan, month, year, site_id)
);

-- SALARY VIEW (Legacy support / Easy Access)
CREATE OR REPLACE VIEW salary_view AS
SELECT * FROM salary_records;

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

-- STORAGE
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true) 
ON CONFLICT (id) DO NOTHING;

-- 3. RPC
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
  RETURN QUERY
  SELECT u.id, u.name, u.role, u.company_id
  FROM users u
  WHERE u.email = p_email 
  AND u.password = p_password;
END;
$$;

-- 4. RLS (Simplified for Development, Production should be stricter)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE r RECORD; 
BEGIN 
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('companies', 'sites', 'users', 'employees', 'salary_records', 'job_roles') 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename); 
    END LOOP; 
END $$;

CREATE POLICY "Public Read All" ON companies FOR ALL USING (true);
CREATE POLICY "Public Read Sites" ON sites FOR ALL USING (true);
CREATE POLICY "Public Read Users" ON users FOR ALL USING (true);
CREATE POLICY "Public Read Emp" ON employees FOR ALL USING (true);
CREATE POLICY "Public Read Sal" ON salary_records FOR ALL USING (true);
CREATE POLICY "Public Read Roles" ON job_roles FOR ALL USING (true);

-- SEED DATA
INSERT INTO companies (id, client_id, name, logo_url, email, address) 
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'KONARK001', 'Konark Enterprises Pvt. Ltd.', 'https://via.placeholder.com/150', 'info@konark.com', 'Pune, India')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, email, password, name, role, company_id)
VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 
  'admin@konark.com', 
  'Hr@12345', 
  'System Admin', 
  'HR', 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
) ON CONFLICT (email) DO UPDATE SET password = 'Hr@12345';

-- SEED DEFAULT JOB ROLES
INSERT INTO job_roles (title, description, is_system_default) VALUES
('Supervisor', 'Site Manager and Team Lead', TRUE),
('Driver', 'Vehicle Operator', TRUE),
('Helper', 'General Assistant', TRUE),
('Safety Officer', 'Ensures site safety protocols', TRUE),
('Other', 'General Role', TRUE)
ON CONFLICT (title) DO NOTHING;