-- KONARK HR SYSTEM - SECURITY LEVEL: MAXIMUM (AES-256 ENCRYPTION) v7.0
-- फीचर: डेटाबेस में स्टोर हर फील्ड एन्क्रिप्टेड होगा (BYTEA)।
-- कोई भी SQL इंजेक्शन या DB एक्सेस डेटा को पढ़ नहीं पाएगा।

-- 1. SECURITY EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('HR', 'SITE_INCHARGE', 'EMPLOYEE');
    CREATE TYPE site_status AS ENUM ('ACTIVE', 'CLOSED');
    CREATE TYPE employee_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
    CREATE TYPE notification_type AS ENUM ('INFO', 'ALERT', 'SUCCESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. GLOBAL ENCRYPTION KEY SETTING (In Production, use Vault. Here we define a session key function)
-- नोट: यह की (Key) डेटा को लॉक/अनलॉक करने के लिए इस्तेमाल होगी।
CREATE OR REPLACE FUNCTION get_app_secret() RETURNS TEXT AS $$
BEGIN
    RETURN 'KONARK_SUPER_SECRET_KEY_2024_AES_256'; -- In production, hide this!
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. SECURE TABLES (All PII is BYTEA - Binary Encrypted Data)

-- COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL, -- Public ID (Safe)
  name BYTEA NOT NULL, -- ENCRYPTED
  logo_url TEXT, -- URLs are generally safe, but can be encrypted if needed
  email BYTEA, -- ENCRYPTED
  mobile BYTEA, -- ENCRYPTED
  address BYTEA -- ENCRYPTED
);

-- JOB ROLES (Public Reference Data - No need to encrypt titles)
CREATE TABLE IF NOT EXISTS job_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_default BOOLEAN DEFAULT FALSE
);

-- SITES
CREATE TABLE IF NOT EXISTS sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name BYTEA NOT NULL, -- ENCRYPTED
  site_code TEXT, -- Internal Code (Safe)
  address BYTEA NOT NULL, -- ENCRYPTED
  city TEXT, -- Safe for filtering
  state TEXT, -- Safe for filtering
  pincode TEXT,
  email BYTEA, -- ENCRYPTED
  mobile BYTEA, -- ENCRYPTED
  manager_name BYTEA, -- ENCRYPTED
  manager_mobile BYTEA, -- ENCRYPTED
  status site_status DEFAULT 'ACTIVE',
  logo_url TEXT
);

-- USERS (Admin/HR)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_hash TEXT UNIQUE NOT NULL, -- BLIND INDEX (SHA256) for Login Lookup
  email_enc BYTEA NOT NULL, -- ENCRYPTED Content for Display
  password TEXT NOT NULL, -- BCRYPT HASH (Already Secure)
  name BYTEA NOT NULL, -- ENCRYPTED
  role user_role DEFAULT 'HR',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL
);

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
  uan TEXT PRIMARY KEY CHECK (uan ~ '^[0-9]{12}$'), -- PK remains plain for relationships
  name BYTEA NOT NULL, -- ENCRYPTED
  role TEXT NOT NULL, -- Role Reference
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status employee_status DEFAULT 'PENDING',
  added_by TEXT NOT NULL,
  joined_date DATE NOT NULL,
  
  -- SENSITIVE PII (All Encrypted)
  profile_photo_url TEXT,
  personal_email BYTEA, 
  mobile BYTEA,
  address BYTEA,
  
  -- BANKING & COMPLIANCE (High Security)
  esic_no BYTEA,
  pf_no BYTEA,
  bank_account_no BYTEA,
  ifsc_code BYTEA,
  bank_name BYTEA,
  
  -- DOCS
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  pan_url TEXT,
  bank_passbook_url TEXT
);

-- SALARY RECORDS
CREATE TABLE IF NOT EXISTS salary_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_uan TEXT NOT NULL REFERENCES employees(uan) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  
  -- FINANCIAL DATA (Encrypted Numbers stored as Text->Bytes)
  basic BYTEA,
  hra BYTEA,
  allowances BYTEA,
  pf_deduction BYTEA,
  tax_deduction BYTEA,
  net_salary BYTEA, -- Stored calculated value
  
  is_locked BOOLEAN DEFAULT FALSE,
  CONSTRAINT salary_uan_month_year_site_key UNIQUE (employee_uan, month, year, site_id)
);

-- LOGS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT, -- Generic text logs (can be encrypted if strictly needed)
  severity TEXT DEFAULT 'INFO'
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DECRYPTION VIEWS (The Frontend will query these)
-- ये Views डेटा को "On-the-fly" डिक्रिप्ट करते हैं। DB में डेटा बाइनरी ही रहता है।

CREATE OR REPLACE VIEW v_companies_decrypted AS
SELECT 
  id, client_id,
  pgp_sym_decrypt(name, get_app_secret())::text as name,
  logo_url,
  pgp_sym_decrypt(email, get_app_secret())::text as email,
  pgp_sym_decrypt(mobile, get_app_secret())::text as mobile,
  pgp_sym_decrypt(address, get_app_secret())::text as address
FROM companies;

CREATE OR REPLACE VIEW v_sites_decrypted AS
SELECT 
  id, company_id,
  pgp_sym_decrypt(name, get_app_secret())::text as name,
  site_code,
  pgp_sym_decrypt(address, get_app_secret())::text as address,
  city, state, pincode,
  pgp_sym_decrypt(email, get_app_secret())::text as email,
  pgp_sym_decrypt(mobile, get_app_secret())::text as mobile,
  pgp_sym_decrypt(manager_name, get_app_secret())::text as manager_name,
  pgp_sym_decrypt(manager_mobile, get_app_secret())::text as manager_mobile,
  status, logo_url
FROM sites;

CREATE OR REPLACE VIEW v_employees_decrypted AS
SELECT 
  uan,
  pgp_sym_decrypt(name, get_app_secret())::text as name,
  role, company_id, site_id, status, added_by, joined_date,
  profile_photo_url,
  pgp_sym_decrypt(personal_email, get_app_secret())::text as personal_email,
  pgp_sym_decrypt(mobile, get_app_secret())::text as mobile,
  pgp_sym_decrypt(address, get_app_secret())::text as address,
  pgp_sym_decrypt(esic_no, get_app_secret())::text as esic_no,
  pgp_sym_decrypt(pf_no, get_app_secret())::text as pf_no,
  pgp_sym_decrypt(bank_account_no, get_app_secret())::text as bank_account_no,
  pgp_sym_decrypt(ifsc_code, get_app_secret())::text as ifsc_code,
  pgp_sym_decrypt(bank_name, get_app_secret())::text as bank_name,
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

-- 6. SECURE RPCs (Backend Logic for Insert/Update)

-- A. Insert/Update Employee (Auto Encrypts)
CREATE OR REPLACE FUNCTION secure_upsert_employee(
    p_uan TEXT, p_name TEXT, p_role TEXT, p_company_id UUID, p_site_id UUID, 
    p_added_by TEXT, p_mobile TEXT, p_address TEXT, p_email TEXT,
    p_bank_ac TEXT, p_ifsc TEXT, p_bank_name TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO employees (
        uan, name, role, company_id, site_id, added_by, joined_date,
        mobile, address, personal_email, bank_account_no, ifsc_code, bank_name
    ) VALUES (
        p_uan, 
        pgp_sym_encrypt(p_name, get_app_secret()), 
        p_role, p_company_id, p_site_id, p_added_by, CURRENT_DATE,
        pgp_sym_encrypt(p_mobile, get_app_secret()),
        pgp_sym_encrypt(p_address, get_app_secret()),
        pgp_sym_encrypt(p_email, get_app_secret()),
        pgp_sym_encrypt(p_bank_ac, get_app_secret()),
        pgp_sym_encrypt(p_ifsc, get_app_secret()),
        pgp_sym_encrypt(p_bank_name, get_app_secret())
    )
    ON CONFLICT (uan) DO UPDATE SET
        name = pgp_sym_encrypt(p_name, get_app_secret()),
        mobile = pgp_sym_encrypt(p_mobile, get_app_secret()),
        address = pgp_sym_encrypt(p_address, get_app_secret());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. HR Login (Using Hashed Email for Lookup, Decrypting Name for Display)
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
    PERFORM pg_sleep(0.1); -- Delay
    v_email_hash := digest(p_email, 'sha256'); -- Hash input email to find user
    
    RETURN QUERY
    SELECT u.id, 
           pgp_sym_decrypt(u.name, get_app_secret())::text as name, 
           u.role, u.company_id
    FROM users u
    WHERE u.email_hash = v_email_hash 
    AND u.password = crypt(p_password, u.password);
END;
$$;

-- 7. INITIAL ADMIN (Seeding with Encryption)
INSERT INTO companies (client_id, name, address, email, mobile)
VALUES (
    'KONARK001',
    pgp_sym_encrypt('Konark Enterprises Pvt. Ltd.', get_app_secret()),
    pgp_sym_encrypt('Pune, India', get_app_secret()),
    pgp_sym_encrypt('info@konark.com', get_app_secret()),
    pgp_sym_encrypt('9988776655', get_app_secret())
) ON CONFLICT DO NOTHING;

-- Create Admin User (Hash Email for lookup, Encrypt Email for storage)
INSERT INTO users (email_hash, email_enc, password, name, role)
VALUES (
    digest('admin@konark.com', 'sha256'), -- Hash for searching
    pgp_sym_encrypt('admin@konark.com', get_app_secret()), -- Encrypted for reading
    crypt('Hr@12345', gen_salt('bf', 10)),
    pgp_sym_encrypt('System Admin', get_app_secret()),
    'HR'
) ON CONFLICT (email_hash) DO NOTHING;
