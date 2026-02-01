# Konark HR System - Production Architecture Report

## 1. System Overview
Konark HR System is an enterprise-grade resource management platform designed for construction and multi-site organizations. It strictly enforces role-based access control, secure identity management, and automated payroll processing.

### Roles & Access
1.  **HR Admin**: Full system control. Authenticates via **Secure Email/Password** (Supabase Auth).
2.  **Site Incharge**: Manages site rosters. Authenticates via **12-Digit UAN**.
3.  **Employee**: View-only access to payslips. Authenticates via **12-Digit UAN**.

---

## 2. Identity & Authentication Model
The system uses a **Split Identity Strategy** to maximize security and usability.

*   **HR Identity**:
    *   **Source**: Supabase Auth (`auth.users`).
    *   **Identifier**: UUID.
    *   **Security**: Encrypted passwords managed by Supabase. No passwords stored in app DB.
*   **Staff Identity**:
    *   **Source**: `employees` table.
    *   **Identifier**: UAN (12-Digit Numeric).
    *   **Security**: Passwordless ID-based access (suitable for field workers).

---

## 3. Database Architecture
**PostgreSQL** schema optimized for data integrity and business logic enforcement.

### Key Tables
*   `users`: HR profiles linked to `auth.users` UUID.
*   `employees`: Staff profiles. **Primary Key: UAN**.
*   `salary_records`: Raw salary components. **Foreign Key: UAN**.
*   `salary_view`: **Computed View** that calculates `net_salary` on the fly. This ensures payroll logic is centralized in the database, not frontend code.
*   `audit_logs`: Tracks all critical actions by Actor ID (UUID or UAN).

### Schema Security
*   **Row Level Security (RLS)**: (Recommended for production deployment)
    *   HR: `SELECT *` on all tables.
    *   Staff: `SELECT` on own UAN records only.

---

## 4. Payroll Workflow
1.  **Onboarding**: Site Incharge adds employee -> Status `PENDING`.
2.  **Approval**: HR reviews and sets status `APPROVED`.
3.  **Processing**: HR uploads Excel sheet with **UAN** mapping.
4.  **Calculation**: System inserts raw data. `salary_view` computes Net Pay.
5.  **Distribution**: Employees log in with UAN to download PDF.

---

## 5. Deployment Guide
1.  Create Supabase Project.
2.  Run `db_schema.sql` in SQL Editor.
3.  Create HR User in Supabase Auth Dashboard.
4.  Seed `users` table with the created Auth UUID.
5.  Deploy Frontend to Vercel/Coolify.
