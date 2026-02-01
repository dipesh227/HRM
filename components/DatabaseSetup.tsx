import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, ExternalLink, RefreshCw, Database, Server, Code } from 'lucide-react';

export const DatabaseSetup: React.FC<{ onRetry: () => void, error: string, errorCode?: string }> = ({ onRetry, error, errorCode }) => {
  const [copied, setCopied] = useState(false);

  // SQL Schema Content
  const schema = `-- PostgreSQL Database Schema for Konark Enterprises HR System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
CREATE TYPE user_role AS ENUM ('HR', 'SITE_INCHARGE', 'EMPLOYEE');
CREATE TYPE site_status AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE employee_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
CREATE TYPE employee_role AS ENUM ('Supervisor', 'Driver', 'Helper', 'Safety Officer', 'Other');
CREATE TYPE severity_level AS ENUM ('INFO', 'WARN', 'CRITICAL');
CREATE TYPE notification_type AS ENUM ('INFO', 'ALERT', 'SUCCESS');

-- Companies Table
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT
);

-- Sites Table
CREATE TABLE sites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- Users Table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  uan TEXT,
  email TEXT,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  CONSTRAINT users_email_key UNIQUE (email)
);

-- Employees Table
CREATE TABLE employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  uan TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role employee_role NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status employee_status DEFAULT 'PENDING',
  added_by UUID NOT NULL,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Salary Records Table
CREATE TABLE salary_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic NUMERIC(10,2) DEFAULT 0.00,
  hra NUMERIC(10,2) DEFAULT 0.00,
  allowances NUMERIC(10,2) DEFAULT 0.00,
  pf_deduction NUMERIC(10,2) DEFAULT 0.00,
  tax_deduction NUMERIC(10,2) DEFAULT 0.00,
  net_salary NUMERIC(10,2) DEFAULT 0.00,
  is_locked BOOLEAN DEFAULT FALSE,
  CONSTRAINT salary_emp_month_year_key UNIQUE (employee_id, month, year)
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  severity severity_level DEFAULT 'INFO'
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Seed Data
INSERT INTO companies (id, client_id, name, logo_url) 
VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'KONARK001', 'Konark Enterprises Pvt. Ltd.', 'https://via.placeholder.com/150');

INSERT INTO sites (id, company_id, name, site_code, address, city, state, pincode, email, mobile, manager_name, manager_mobile, status) 
VALUES 
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Konark Site - Pune HQ', 'KE-PUN-01', 'Plot No. 45/B, Rajiv Gandhi Infotech Park', 'Pune', 'Maharashtra', '411057', 'pune.admin@konark.com', '+91 98765 43210', 'Amit Sharma', '+91 99988 87776', 'ACTIVE');

INSERT INTO users (id, uan, email, password, name, role, company_id) 
VALUES 
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '', 'hr@konark.com', '123', 'HR Admin', 'HR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-red-50 p-6 border-b border-red-100 flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">Connection Failed (Self-Hosted Supabase)</h2>
                <p className="text-slate-600 mt-1">
                    {isSchemaError ? "We connected to your server, but the database is empty." : "We couldn't reach your Supabase instance."}
                </p>
                <div className="mt-2 text-xs font-mono bg-white border border-red-200 text-red-600 p-2 rounded max-w-xl truncate">
                    Code: {errorCode || 'UNKNOWN'} | {error}
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
            
            {/* Step 1: Config (Highlight if Auth/Network Error) */}
            <div className={`flex gap-4 transition-opacity ${isSchemaError ? 'opacity-50' : 'opacity-100'}`}>
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${isSchemaError ? 'bg-green-500' : 'bg-slate-800'}`}>
                        {isSchemaError ? <Check className="w-5 h-5" /> : '1'}
                    </div>
                    <div className="w-0.5 h-full bg-slate-200"></div>
                </div>
                <div className="pb-8">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Server className="w-5 h-5 text-slate-400" />
                        Configure Coolify Variables
                    </h3>
                    <p className="text-slate-500 mb-2">Ensure your environment variables are correct in Coolify.</p>
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <code className="text-slate-700 font-bold">VITE_SUPABASE_URL</code>
                            <span className="text-slate-500 text-xs">Instance URL</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <code className="text-slate-700 font-bold">VITE_SUPABASE_ANON_KEY</code>
                            <span className="text-slate-500 text-xs">Public/Anon Key</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Schema (Highlight if Schema Error) */}
            <div className={`flex gap-4 transition-opacity ${!isSchemaError && !isAuthError ? 'opacity-100' : isAuthError ? 'opacity-50' : 'opacity-100'}`}>
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold ${isSchemaError ? 'animate-pulse ring-4 ring-red-100' : ''}`}>2</div>
                </div>
                <div className="pb-8 w-full">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Code className="w-5 h-5 text-slate-400" />
                        Run Database Schema
                    </h3>
                    <p className="text-slate-500 mb-3">
                        Copy this SQL and run it in your <strong>Supabase Studio SQL Editor</strong> to create tables and seed initial data.
                    </p>
                    <div className="relative group">
                        <div className="absolute top-2 right-2">
                            <button onClick={handleCopy} className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-medium backdrop-blur-sm transition-colors border border-white/20">
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied!' : 'Copy SQL'}
                            </button>
                        </div>
                        <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono h-48 overflow-y-auto whitespace-pre">
                            {schema}
                        </pre>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end gap-3">
             <button onClick={onRetry} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" /> Verify Connection
             </button>
        </div>
      </div>
    </div>
  );
};