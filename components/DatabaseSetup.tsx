import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, ExternalLink, RefreshCw, Database, Server, Code } from 'lucide-react';

export const DatabaseSetup: React.FC<{ onRetry: () => void, error: string, errorCode?: string }> = ({ onRetry, error, errorCode }) => {
  const [copied, setCopied] = useState(false);

  // SQL Schema Content
  const schema = `-- PostgreSQL Database Schema for Konark HR System
-- Production Ready Upgrade v3.3 (Fix Recursion & Strict Auth)

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

-- USERS (HR Only - Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
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
-- SECURITY POLICIES (RLS)
-- ==========================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- CRITICAL FIX: Drop ALL existing policies to prevent infinite recursion
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('companies', 'sites', 'users', 'employees', 'salary_records', 'audit_logs', 'notifications') 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename); 
    END LOOP; 
    
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
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
-- Non-recursive policies
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

-- 6. STORAGE
CREATE POLICY "Public Access Assets" ON storage.objects FOR SELECT USING ( bucket_id = 'app-assets' );
CREATE POLICY "Auth Upload Assets" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'app-assets' AND auth.role() = 'authenticated' );

-- SEED DATA
INSERT INTO companies (id, client_id, name, logo_url) 
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'KONARK001', 'Konark Enterprises Pvt. Ltd.', 'https://via.placeholder.com/150')
ON CONFLICT DO NOTHING;

INSERT INTO sites (id, company_id, name, site_code, address, city, state, pincode, email, mobile, manager_name, manager_mobile, status) 
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Konark Site - Pune HQ', 'KE-PUN-01', 'Plot No. 45/B, Rajiv Gandhi Infotech Park', 'Pune', 'Maharashtra', '411057', 'pune.admin@konark.com', '+91 98765 43210', 'Amit Sharma', '+91 99988 87776', 'ACTIVE')
ON CONFLICT DO NOTHING;
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
                        <Code className="w-5 h-5 text-slate-400" />
                        Run Database Schema
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-3">
                        Copy this SQL and run it in your <strong>Supabase Studio SQL Editor</strong> to create tables, enable RLS policies, and seed data.
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