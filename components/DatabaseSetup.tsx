import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, ExternalLink, RefreshCw, Database, Server, Code, ShieldCheck } from 'lucide-react';

export const DatabaseSetup: React.FC<{ onRetry: () => void, error: string, errorCode?: string }> = ({ onRetry, error, errorCode }) => {
  const [copied, setCopied] = useState(false);

  // SQL Schema Content - v7.4 (Fixes RPC missing fields & Type Mismatch)
  const schema = `-- KONARK HR SYSTEM - SECURITY LEVEL: MAXIMUM (AES-256 ENCRYPTION) v7.4
-- FIX: DROP TABLES to ensure columns are created as BYTEA (Binary)
-- FIX: secure_upsert_employee now includes ESIC and PF
-- FIX: secure_upsert_salary added for payroll

-- 1. SECURITY EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CLEANUP (FORCE RESET TO FIX TYPE ERRORS)
DROP VIEW IF EXISTS v_salary_decrypted;
DROP VIEW IF EXISTS v_employees_decrypted;
DROP VIEW IF EXISTS v_sites_decrypted;
DROP VIEW IF EXISTS v_companies_decrypted;

-- DROPPING TABLES - Required to fix "Text vs Bytea" mismatch errors
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
  -- Extra Branding
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

-- A. Insert/Update Employee (With ESIC/PF)
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

-- C. HR Login
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
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(schema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSchemaError = errorCode === 'NO_SCHEMA';
  const isAuthError = errorCode === 'AUTH' || errorCode === 'NETWORK' || !errorCode;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-900/20 p-6 border-b border-red-100 dark:border-red-900/30 flex items-start gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-full text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Connection Failed (Self-Hosted Supabase)</h2>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                    {isSchemaError ? "We connected to your server, but the database is empty." : "We couldn't reach your Supabase instance."}
                </p>
                <div className="mt-2 text-xs font-mono bg-white dark:bg-slate-950 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 p-2 rounded max-w-xl truncate">
                    Code: {errorCode || 'UNKNOWN'} | {error}
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white dark:bg-slate-900">
            
            {/* Step 1: Config (Highlight if Auth/Network Error) */}
            <div className={`flex gap-4 transition-opacity ${isSchemaError ? 'opacity-50' : 'opacity-100'}`}>
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${isSchemaError ? 'bg-green-500' : 'bg-slate-800 dark:bg-slate-700'}`}>
                        {isSchemaError ? <Check className="w-5 h-5" /> : '1'}
                    </div>
                    <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
                <div className="pb-8">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Server className="w-5 h-5 text-slate-400" />
                        Configure Coolify Variables
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-2">Ensure your environment variables are correct in Coolify.</p>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <code className="text-slate-700 dark:text-slate-300 font-bold">VITE_SUPABASE_URL</code>
                            <span className="text-slate-500 dark:text-slate-500 text-xs">Instance URL</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <code className="text-slate-700 dark:text-slate-300 font-bold">VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code>
                            <span className="text-slate-500 dark:text-slate-500 text-xs">Public Key</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Schema (Highlight if Schema Error) */}
            <div className={`flex gap-4 transition-opacity ${!isSchemaError && !isAuthError ? 'opacity-100' : isAuthError ? 'opacity-50' : 'opacity-100'}`}>
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-bold ${isSchemaError ? 'animate-pulse ring-4 ring-red-100 dark:ring-red-900/30' : ''}`}>2</div>
                </div>
                <div className="pb-8 w-full">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                        Run Secure Database Schema (v7.4)
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-3">
                        Copy this SQL and run it in your <strong>Supabase Studio SQL Editor</strong>. This installs <strong>PGCRYPTO</strong> and adds the latest security functions.
                    </p>
                    <div className="relative group">
                        <div className="absolute top-2 right-2">
                            <button onClick={handleCopy} className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-medium backdrop-blur-sm transition-colors border border-white/20">
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied!' : 'Copy SQL'}
                            </button>
                        </div>
                        <pre className="bg-slate-900 dark:bg-black text-slate-300 p-4 rounded-lg text-xs font-mono h-48 overflow-y-auto whitespace-pre">
                            {schema}
                        </pre>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
             <button onClick={onRetry} className="flex items-center gap-2 px-6 py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" /> Verify Connection
             </button>
        </div>
      </div>
    </div>
  );
};