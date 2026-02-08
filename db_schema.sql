-- KONARK HR SYSTEM - STANDARD SCHEMA (NO AES) v1.0
-- Reverted to state before AES-256 Encryption

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Kept for UUIDs and Password Hashing only

-- CLEANUP
DROP VIEW IF EXISTS v_salary_decrypted;
DROP VIEW IF EXISTS v_employees_decrypted;
DROP VIEW IF EXISTS v_sites_decrypted;
DROP VIEW IF EXISTS v_companies_decrypted;

DROP TABLE IF EXISTS salary_records CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS job_roles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('HR', 'SITE_INCHARGE', 'EMPLOYEE');
    CREATE TYPE site_status AS ENUM ('ACTIVE', 'CLOSED');
    CREATE TYPE employee_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
    CREATE TYPE notification_type AS ENUM ('INFO', 'ALERT', 'SUCCESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TABLES (PLAIN TEXT)

CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT, 
  email TEXT, 
  mobile TEXT, 
  address TEXT,
  signature_url TEXT,
  stamp_url TEXT,
  favicon_url TEXT,
  meta_title TEXT,
  meta_description TEXT
);

CREATE TABLE job_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE sites (
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

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL, 
  password TEXT NOT NULL, 
  name TEXT NOT NULL, 
  role user_role DEFAULT 'HR',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE employees (
  uan TEXT PRIMARY KEY CHECK (uan ~ '^[0-9]{12}$'),
  name TEXT NOT NULL, 
  role TEXT NOT NULL, 
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status employee_status DEFAULT 'PENDING',
  added_by TEXT NOT NULL,
  joined_date DATE NOT NULL,
  profile_photo_url TEXT,
  personal_email TEXT, 
  mobile TEXT,
  address TEXT,
  esic_no TEXT,
  pf_no TEXT,
  bank_account_no TEXT,
  ifsc_code TEXT,
  bank_name TEXT,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  pan_url TEXT,
  bank_passbook_url TEXT
);

CREATE TABLE salary_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_uan TEXT NOT NULL REFERENCES employees(uan) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic NUMERIC,
  hra NUMERIC,
  allowances NUMERIC,
  pf_deduction NUMERIC,
  tax_deduction NUMERIC,
  net_salary NUMERIC,
  is_locked BOOLEAN DEFAULT FALSE,
  CONSTRAINT salary_uan_month_year_site_key UNIQUE (employee_uan, month, year, site_id)
);

CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  severity TEXT DEFAULT 'INFO'
);

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- RPCs (PLAIN)

CREATE OR REPLACE FUNCTION upsert_employee(
    p_uan TEXT, p_name TEXT, p_role TEXT, p_company_id UUID, p_site_id UUID, 
    p_added_by TEXT, p_mobile TEXT, p_address TEXT, p_email TEXT,
    p_bank_ac TEXT, p_ifsc TEXT, p_bank_name TEXT,
    p_esic TEXT, p_pf TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO employees (
        uan, name, role, company_id, site_id, added_by, joined_date,
        mobile, address, personal_email, bank_account_no, ifsc_code, bank_name,
        esic_no, pf_no
    ) VALUES (
        p_uan, p_name, p_role, p_company_id, p_site_id, p_added_by, CURRENT_DATE,
        p_mobile, p_address, p_email, p_bank_ac, p_ifsc, p_bank_name, p_esic, p_pf
    )
    ON CONFLICT (uan) DO UPDATE SET
        name = p_name,
        role = p_role, 
        company_id = p_company_id, 
        site_id = p_site_id, 
        mobile = p_mobile,
        address = p_address,
        personal_email = p_email,
        bank_account_no = p_bank_ac,
        ifsc_code = p_ifsc,
        bank_name = p_bank_name,
        esic_no = p_esic,
        pf_no = p_pf;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION upsert_salary(
    p_uan TEXT, p_site_id UUID, p_month INTEGER, p_year INTEGER,
    p_basic NUMERIC, p_hra NUMERIC, p_allowances NUMERIC,
    p_pf NUMERIC, p_tax NUMERIC
) RETURNS VOID AS $$
DECLARE
    v_net NUMERIC;
BEGIN
    v_net := p_basic + p_hra + p_allowances - p_pf - p_tax;
    
    INSERT INTO salary_records (
        employee_uan, site_id, month, year,
        basic, hra, allowances, pf_deduction, tax_deduction, net_salary,
        is_locked
    ) VALUES (
        p_uan, p_site_id, p_month, p_year,
        p_basic, p_hra, p_allowances, p_pf, p_tax, v_net, TRUE
    )
    ON CONFLICT (employee_uan, month, year, site_id) DO UPDATE SET
        basic = p_basic,
        hra = p_hra,
        allowances = p_allowances,
        pf_deduction = p_pf,
        tax_deduction = p_tax,
        net_salary = v_net;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION upsert_site(
    p_id UUID, 
    p_company_id UUID,
    p_name TEXT,
    p_site_code TEXT,
    p_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_pincode TEXT,
    p_logo_url TEXT,
    p_manager_name TEXT DEFAULT NULL,
    p_manager_mobile TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF p_id IS NULL THEN
        INSERT INTO sites (
            company_id, name, site_code, address, city, state, pincode, logo_url,
            manager_name, manager_mobile
        ) VALUES (
            p_company_id, p_name, p_site_code, p_address, p_city, p_state, p_pincode, p_logo_url,
            p_manager_name, p_manager_mobile
        );
    ELSE
        UPDATE sites SET
            name = p_name,
            site_code = p_site_code,
            address = p_address,
            city = p_city, state = p_state, pincode = p_pincode,
            logo_url = p_logo_url,
            manager_name = p_manager_name,
            manager_mobile = p_manager_mobile
        WHERE id = p_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION hr_login(p_email TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  role user_role,
  company_id UUID
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.role, u.company_id
    FROM users u
    WHERE u.email = p_email 
    AND u.password = crypt(p_password, u.password);
END;
$$;

-- SEED
INSERT INTO companies (client_id, name, address, email, mobile)
VALUES (
    'KONARK001',
    'Konark Enterprises Pvt. Ltd.',
    'Pune, India',
    'info@konark.com',
    '9988776655'
) ON CONFLICT DO NOTHING;

INSERT INTO users (email, password, name, role)
VALUES (
    'admin@konark.com',
    crypt('Hr@12345', gen_salt('bf', 10)),
    'System Admin',
    'HR'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO job_roles (title, description, is_system_default) VALUES
('Supervisor', 'Site Manager', TRUE),
('Driver', 'Vehicle Operator', TRUE),
('Helper', 'General Assistant', TRUE),
('Safety Officer', 'Site Safety', TRUE)
ON CONFLICT (title) DO NOTHING;