# Konark HR System - Project Report

## 1. System Overview
**Konark HR System** is a role-based Human Resource and Payroll management application designed for multi-site organizations. It is built using **React 19** and **Supabase (PostgreSQL)**.

The system caters to three distinct user roles:
1.  **HR Admin**: Centralized control over all sites, user management, employee approvals, and payroll processing (Bulk & Single).
2.  **Site Incharge**: Manages specific construction sites, maintains the employee roster, and onboards new workers (subject to HR approval).
3.  **Employee**: View-only access to their profile and salary history, with the ability to generate and download PDF payslips.

---

## 2. Technical Stack

*   **Frontend Framework**: React 19 (Vite)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Database**: Supabase (Self-Hosted via Coolify)
*   **Key Libraries**:
    *   `@supabase/supabase-js`: Database interaction.
    *   `recharts`: Data visualization for HR analytics.
    *   `lucide-react`: UI Icons.
    *   `xlsx`: Parsing Excel files for bulk salary uploads.
    *   `jspdf` & `html2canvas`: Generating PDF payslips from the UI.

---

## 3. Database Architecture

The database is structured in PostgreSQL with Relational Integrity.

### Core Tables
1.  **companies**: The root entity.
2.  **sites**: Physical locations linked to a company.
3.  **users**: Authentication table for HR and Site Incharges.
4.  **employees**: Worker profiles linked to Sites.
5.  **salary_records**: Monthly financial data for employees.
6.  **audit_logs**: Tracks critical system actions.
7.  **notifications**: User alerts system.

### SQL Schema (`db_schema.sql`)
*Execute this in Supabase SQL Editor to set up the backend.*

```sql
-- PostgreSQL Database Schema for Konark Enterprises HR System

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
```

---

## 4. Key Code Implementation

### A. Database Service (`services/mockDb.ts`)
This file wraps the Supabase client and provides a Singleton instance `dbService`. It handles specific connection error states.

**Key Feature: 2-Level Connection Check**
This logic distinguishes between "Cannot connect to server" and "Connected but tables missing".

```typescript
async checkConnection(): Promise<ConnectionStatus> {
    if (!supabase) return { connected: false, error: "Missing Environment Variables", code: 'AUTH' };
    
    try {
        // We try to select from 'companies'.
        const { error } = await supabase.from('companies').select('id', { count: 'exact', head: true });
        
        if (error) {
            // Level 2: Connected but Schema Missing (Postgres Code 42P01 = undefined_table)
            if (error.code === '42P01') {
                return { connected: false, error: "Schema missing: 'companies' table not found.", code: 'NO_SCHEMA' };
            }
            // Level 1: Auth/Network Failed
            if (error.code === 'PGRST301' || error.message.includes('JWT') || error.code === '401') {
                return { connected: false, error: "Invalid API Key or JWT expired.", code: 'AUTH' };
            }
            return { connected: false, error: error.message, code: 'NETWORK' };
        }

        return { connected: true };
    } catch (e: any) {
        return { connected: false, error: e.message, code: 'NETWORK' };
    }
}
```

### B. Authentication (`components/Auth/Login.tsx`)
Handles login with specific error messaging.
*   **Input**: Accepts Email (HR) or UAN (Staff).
*   **Validation**: Checks role mismatch on the client side after fetching user.

```typescript
const handleLogin = async (e: React.FormEvent) => {
  // ...
  try {
    const user = await dbService.login(identifier, password);
    
    // Client-side Role Mismatch Check
    if (user.role !== role) {
       throw new Error(`Access Denied: Registered as ${user.role}, trying to login as ${role}.`);
    }

    onLogin(user);
  } catch (err: any) {
    setError(err.message); // Displays "Account not found" or "Incorrect password"
  }
};
```

### C. Salary Upload (HR Dashboard)
Reads an Excel file and maps columns to the database schema.

```typescript
const handleSalaryUpload = async () => {
  // ... file reading logic ...
  const data = utils.sheet_to_json(ws);
  const uanMap = await dbService.getAllEmployeesMap(); // Cache UAN -> ID map
  
  for (const row of data) {
    const empId = uanMap.get(row.UAN);
    if (empId) {
        // Create record object
        records.push({ employeeId: empId, basic: row.Basic, ... });
    }
  }
  await dbService.uploadSalaryData(records); // Upsert to DB
};
```

---

## 5. Environment & Configuration

### `.env` File
Contains the connection string to the self-hosted Supabase instance.
```env
VITE_SUPABASE_URL=http://supabasekong-t088cs880kwwk8skk80w8gs0.72.61.241.98.sslip.io
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2OTk0ODg4MCwiZXhwIjo0OTI1NjIyNDgwLCJyb2xlIjoiYW5vbiJ9.C4xsBql4Wksk_kozvOWjblzabaHB1JgeGVPseuOOcKA
```

### `db_employees.csv`
Sample CSV structure for importing/seeding employee data.
```csv
uan,name,role,company_id,site_id,status,joined_date,added_by
EMP100,Rajesh Kumar,Supervisor,uuid...,uuid...,APPROVED,2024-01-01,uuid...
```

---

## 6. Directory Structure

```text
/
├── .env                  # Environment Variables
├── db_schema.sql         # Database Schema Script
├── db_employees.csv      # Sample Data
├── report.md             # This Report
├── index.html
├── App.tsx               # Main Application Component
├── types.ts              # TypeScript Interfaces
├── services/
│   └── mockDb.ts         # Supabase Service Layer
└── components/
    ├── Auth/             # Login & Auth Logic
    ├── HR/               # HR Dashboard (Analytics, Sites, Payroll)
    ├── Site/             # Site Dashboard (Roster, Add Employee)
    ├── Employee/         # Employee View (Payslips)
    └── DatabaseSetup.tsx # DB Connection Error UI
```
