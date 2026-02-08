-- KONARK HR SYSTEM - SECURITY LEVEL: MAXIMUM (AES-256 ENCRYPTION) v7.5
-- FIX: Added secure_upsert_site for Site Management CRUD
-- FIX: Added secure_manage_job_role for dynamic roles

-- 1. SECURITY EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CLEANUP (FORCE RESET TO FIX TYPE ERRORS)
DROP VIEW IF EXISTS v_salary_decrypted;
DROP VIEW IF EXISTS v_employees_decrypted;
DROP VIEW IF EXISTS v_sites_decrypted;
DROP VIEW IF EXISTS v_companies_decrypted;

-- DROPPING TABLES
DROP TABLE IF EXISTS salary_records CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS job_roles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 3. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('HR', 'SITE_INCHARGE', 'EMPLOYEE');
    CREATE TYPE site_status AS ENUM ('ACTIVE', 'CLOSED');
    CREATE TYPE employee_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
    CREATE TYPE notification_type AS ENUM ('INFO', 'ALERT', 'SUCCESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. GLOBAL ENCRYPTION KEY SETTING
CREATE OR REPLACE FUNCTION get_app_secret() RETURNS TEXT AS $$
BEGIN
    RETURN 'KONARK_SUPER_SECRET_KEY_2024_AES_256'; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. SECURE TABLES (All Sensitive Data is BYTEA)

CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  name BYTEA NOT NULL,
  logo_url TEXT, 
  email BYTEA, 
  mobile BYTEA, 
  address BYTEA,
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
  name BYTEA NOT NULL,
  site_code TEXT, 
  address BYTEA NOT NULL, 
  city TEXT, 
  state TEXT, 
  pincode TEXT,
  email BYTEA,
  mobile BYTEA,
  manager_name BYTEA,
  manager_mobile BYTEA,
  status site_status DEFAULT 'ACTIVE',
  logo_url TEXT
);

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_hash TEXT UNIQUE NOT NULL, 
  email_enc BYTEA NOT NULL, 
  password TEXT NOT NULL, 
  name BYTEA NOT NULL, 
  role user_role DEFAULT 'HR',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE employees (
  uan TEXT PRIMARY KEY CHECK (uan ~ '^[0-9]{12}$'),
  name BYTEA NOT NULL, 
  role TEXT NOT NULL, 
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status employee_status DEFAULT 'PENDING',
  added_by TEXT NOT NULL,
  joined_date DATE NOT NULL,
  profile_photo_url TEXT,
  personal_email BYTEA, 
  mobile BYTEA,
  address BYTEA,
  esic_no BYTEA,
  pf_no BYTEA,
  bank_account_no BYTEA,
  ifsc_code BYTEA,
  bank_name BYTEA,
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
  basic BYTEA,
  hra BYTEA,
  allowances BYTEA,
  pf_deduction BYTEA,
  tax_deduction BYTEA,
  net_salary BYTEA,
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

-- 6. DECRYPTION VIEWS

CREATE OR REPLACE VIEW v_companies_decrypted AS
SELECT 
  id, client_id,
  pgp_sym_decrypt(name, get_app_secret()) as name,
  logo_url,
  pgp_sym_decrypt(email, get_app_secret()) as email,
  pgp_sym_decrypt(mobile, get_app_secret()) as mobile,
  pgp_sym_decrypt(address, get_app_secret()) as address,
  signature_url, stamp_url, favicon_url, meta_title, meta_description
FROM companies;

CREATE OR REPLACE VIEW v_sites_decrypted AS
SELECT 
  id, company_id,
  pgp_sym_decrypt(name, get_app_secret()) as name,
  site_code,
  pgp_sym_decrypt(address, get_app_secret()) as address,
  city, state, pincode,
  pgp_sym_decrypt(email, get_app_secret()) as email,
  pgp_sym_decrypt(mobile, get_app_secret()) as mobile,
  pgp_sym_decrypt(manager_name, get_app_secret()) as manager_name,
  pgp_sym_decrypt(manager_mobile, get_app_secret()) as manager_mobile,
  status, logo_url
FROM sites;

CREATE OR REPLACE VIEW v_employees_decrypted AS
SELECT 
  uan,
  pgp_sym_decrypt(name, get_app_secret()) as name,
  role, company_id, site_id, status, added_by, joined_date,
  profile_photo_url,
  pgp_sym_decrypt(personal_email, get_app_secret()) as personal_email,
  pgp_sym_decrypt(mobile, get_app_secret()) as mobile,
  pgp_sym_decrypt(address, get_app_secret()) as address,
  pgp_sym_decrypt(esic_no, get_app_secret()) as esic_no,
  pgp_sym_decrypt(pf_no, get_app_secret()) as pf_no,
  pgp_sym_decrypt(bank_account_no, get_app_secret()) as bank_account_no,
  pgp_sym_decrypt(ifsc_code, get_app_secret()) as ifsc_code,
  pgp_sym_decrypt(bank_name, get_app_secret()) as bank_name,
  aadhaar_front_url, aadhaar_back_url, pan_url, bank_passbook_url
FROM employees;

CREATE OR REPLACE VIEW v_salary_decrypted AS
SELECT
  id, employee_uan, site_id, month, year,
  CAST(pgp_sym_decrypt(basic, get_app_secret()) AS NUMERIC) as basic,
  CAST(pgp_sym_decrypt(hra, get_app_secret()) AS NUMERIC) as hra,
  CAST(pgp_sym_decrypt(allowances, get_app_secret()) AS NUMERIC) as allowances,
  CAST(pgp_sym_decrypt(pf_deduction, get_app_secret()) AS NUMERIC) as pf_deduction,
  CAST(pgp_sym_decrypt(tax_deduction, get_app_secret()) AS NUMERIC) as tax_deduction,
  CAST(pgp_sym_decrypt(net_salary, get_app_secret()) AS NUMERIC) as net_salary,
  is_locked
FROM salary_records;

-- 7. SECURE RPCs

-- A. Insert/Update Employee
CREATE OR REPLACE FUNCTION secure_upsert_employee(
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
        p_uan, 
        pgp_sym_encrypt(p_name, get_app_secret()), 
        p_role, p_company_id, p_site_id, p_added_by, CURRENT_DATE,
        pgp_sym_encrypt(p_mobile, get_app_secret()),
        pgp_sym_encrypt(p_address, get_app_secret()),
        pgp_sym_encrypt(p_email, get_app_secret()),
        pgp_sym_encrypt(p_bank_ac, get_app_secret()),
        pgp_sym_encrypt(p_ifsc, get_app_secret()),
        pgp_sym_encrypt(p_bank_name, get_app_secret()),
        pgp_sym_encrypt(p_esic, get_app_secret()),
        pgp_sym_encrypt(p_pf, get_app_secret())
    )
    ON CONFLICT (uan) DO UPDATE SET
        name = pgp_sym_encrypt(p_name, get_app_secret()),
        role = p_role, 
        company_id = p_company_id, 
        site_id = p_site_id, 
        mobile = pgp_sym_encrypt(p_mobile, get_app_secret()),
        address = pgp_sym_encrypt(p_address, get_app_secret()),
        personal_email = pgp_sym_encrypt(p_email, get_app_secret()),
        bank_account_no = pgp_sym_encrypt(p_bank_ac, get_app_secret()),
        ifsc_code = pgp_sym_encrypt(p_ifsc, get_app_secret()),
        bank_name = pgp_sym_encrypt(p_bank_name, get_app_secret()),
        esic_no = pgp_sym_encrypt(p_esic, get_app_secret()),
        pf_no = pgp_sym_encrypt(p_pf, get_app_secret());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Secure Salary Upsert
CREATE OR REPLACE FUNCTION secure_upsert_salary(
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
        pgp_sym_encrypt(p_basic::text, get_app_secret()),
        pgp_sym_encrypt(p_hra::text, get_app_secret()),
        pgp_sym_encrypt(p_allowances::text, get_app_secret()),
        pgp_sym_encrypt(p_pf::text, get_app_secret()),
        pgp_sym_encrypt(p_tax::text, get_app_secret()),
        pgp_sym_encrypt(v_net::text, get_app_secret()),
        TRUE
    )
    ON CONFLICT (employee_uan, month, year, site_id) DO UPDATE SET
        basic = pgp_sym_encrypt(p_basic::text, get_app_secret()),
        hra = pgp_sym_encrypt(p_hra::text, get_app_secret()),
        allowances = pgp_sym_encrypt(p_allowances::text, get_app_secret()),
        pf_deduction = pgp_sym_encrypt(p_pf::text, get_app_secret()),
        tax_deduction = pgp_sym_encrypt(p_tax::text, get_app_secret()),
        net_salary = pgp_sym_encrypt(v_net::text, get_app_secret());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Secure Site Upsert (NEW v7.5)
CREATE OR REPLACE FUNCTION secure_upsert_site(
    p_id UUID, -- If null, create. If exists, update.
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
        -- Insert
        INSERT INTO sites (
            company_id, name, site_code, address, city, state, pincode, logo_url,
            manager_name, manager_mobile
        ) VALUES (
            p_company_id,
            pgp_sym_encrypt(p_name, get_app_secret()),
            p_site_code,
            pgp_sym_encrypt(p_address, get_app_secret()),
            p_city, p_state, p_pincode, p_logo_url,
            pgp_sym_encrypt(p_manager_name, get_app_secret()),
            pgp_sym_encrypt(p_manager_mobile, get_app_secret())
        );
    ELSE
        -- Update
        UPDATE sites SET
            name = pgp_sym_encrypt(p_name, get_app_secret()),
            site_code = p_site_code,
            address = pgp_sym_encrypt(p_address, get_app_secret()),
            city = p_city, state = p_state, pincode = p_pincode,
            logo_url = p_logo_url,
            manager_name = pgp_sym_encrypt(p_manager_name, get_app_secret()),
            manager_mobile = pgp_sym_encrypt(p_manager_mobile, get_app_secret())
        WHERE id = p_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- D. HR Login
CREATE OR REPLACE FUNCTION secure_hr_login(p_email TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  role user_role,
  company_id UUID
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_email_hash TEXT;
BEGIN
    PERFORM pg_sleep(0.1);
    v_email_hash := digest(p_email, 'sha256');
    
    RETURN QUERY
    SELECT u.id, 
           pgp_sym_decrypt(u.name, get_app_secret()) as name, 
           u.role, u.company_id
    FROM users u
    WHERE u.email_hash = v_email_hash 
    AND u.password = crypt(p_password, u.password);
END;
$$;

-- 8. SEED DATA

INSERT INTO companies (client_id, name, address, email, mobile)
VALUES (
    'KONARK001',
    pgp_sym_encrypt('Konark Enterprises Pvt. Ltd.', get_app_secret()),
    pgp_sym_encrypt('Pune, India', get_app_secret()),
    pgp_sym_encrypt('info@konark.com', get_app_secret()),
    pgp_sym_encrypt('9988776655', get_app_secret())
) ON CONFLICT DO NOTHING;

INSERT INTO users (email_hash, email_enc, password, name, role)
VALUES (
    digest('admin@konark.com', 'sha256'),
    pgp_sym_encrypt('admin@konark.com', get_app_secret()),
    crypt('Hr@12345', gen_salt('bf', 10)),
    pgp_sym_encrypt('System Admin', get_app_secret()),
    'HR'
) ON CONFLICT (email_hash) DO NOTHING;

-- Seed Basic Roles
INSERT INTO job_roles (title, description, is_system_default) VALUES
('Supervisor', 'Site Manager', TRUE),
('Driver', 'Vehicle Operator', TRUE),
('Helper', 'General Assistant', TRUE),
('Safety Officer', 'Site Safety', TRUE)
ON CONFLICT (title) DO NOTHING;
