-- PostgreSQL Database Schema for Konark Enterprises HR System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums for fixed values
CREATE TYPE user_role AS ENUM ('HR', 'SITE_INCHARGE', 'EMPLOYEE');
CREATE TYPE site_status AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE employee_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
CREATE TYPE employee_role AS ENUM ('Supervisor', 'Driver', 'Helper', 'Safety Officer', 'Other');
CREATE TYPE severity_level AS ENUM ('INFO', 'WARN', 'CRITICAL');
CREATE TYPE notification_type AS ENUM ('INFO', 'ALERT', 'SUCCESS');

-- --------------------------------------------------------

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

-- Users Table (Custom users table, separate from Auth for this specific logic)
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  uan TEXT,
  email TEXT,
  password TEXT NOT NULL, -- In production, ensure this is hashed
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
  added_by UUID NOT NULL, -- References a User ID
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
  user_id TEXT, -- Can be UUID or 'ALL'
  message TEXT NOT NULL,
  type notification_type DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- SEED DATA (Konark Enterprises - Indian Context)
-- --------------------------------------------------------

INSERT INTO companies (id, client_id, name, logo_url) 
VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'KONARK001', 'Konark Enterprises Pvt. Ltd.', 'https://via.placeholder.com/150');

INSERT INTO sites (id, company_id, name, site_code, address, city, state, pincode, email, mobile, manager_name, manager_mobile, status) 
VALUES 
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Konark Site - Pune HQ', 'KE-PUN-01', 'Plot No. 45/B, Rajiv Gandhi Infotech Park', 'Pune', 'Maharashtra', '411057', 'pune.admin@konark.com', '+91 98765 43210', 'Amit Sharma', '+91 99988 87776', 'ACTIVE');

-- Default HR Admin (Password: 123)
INSERT INTO users (id, uan, email, password, name, role, company_id) 
VALUES 
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '', 'hr@konark.com', '123', 'HR Admin', 'HR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Default Site Incharge (Password: 123)
INSERT INTO users (id, uan, email, password, name, role, company_id, site_id) 
VALUES 
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'INC001', 'inc001@konark.com', '123', 'Suresh Patil', 'SITE_INCHARGE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
