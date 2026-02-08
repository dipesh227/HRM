# Konark HR System - Comprehensive System Report

## 1. Executive Summary
The Konark HR System is a role-based Enterprise Resource Planning (ERP) web application designed for multi-site organizations. It streamlines workforce management, digital onboarding, attendance tracking, and automated payroll processing using a secure, responsive interface.

**Technical Architecture:**
*   **Frontend:** React 18 (TypeScript), Tailwind CSS.
*   **Backend:** Supabase (PostgreSQL) via `mockDb.ts` service layer.
*   **State Management:** React Context API (`AuthContext`).
*   **Document Generation:** `html2canvas` + `jspdf` for dynamic salary slips.

---

## 2. Authentication Module
**Files:** `components/Auth/Login.tsx`, `context/AuthContext.tsx`

The entry gate to the system features a **Dual-Identity Authentication Strategy** to accommodate different user types.

### 2.1. Login Modes
1.  **HR Admin Mode:**
    *   **Input:** Corporate Email & Password.
    *   **Logic:** Authenticates against the `users` table using the `hr_login` RPC (Stored Procedure).
    *   **Security:** Uses bcrypt hash verification (database side).
2.  **Staff / Site Mode:**
    *   **Input:** 12-Digit UAN (Universal Account Number).
    *   **Logic:** Authenticates against the `employees` table.
    *   **Validation:** Checks if status is `APPROVED`.
    *   **Role Assignment:** Automatically detects if the user is a `Supervisor` (Site Incharge) or a regular `Helper` (Employee) based on their job role.

### 2.2. Session Management
*   **AuthContext:** Manages global user state.
*   **Hard Reset:** On application load, it verifies the integrity of `localStorage`. If corruption is detected (e.g., mismatched schema), it triggers a nuclear clear to prevent "White Screen of Death".
*   **Protection:** `ProtectedRoute` in `App.tsx` ensures users cannot access routes unauthorized for their role.

---

## 3. HR Administration Module
**Files:** `components/HR/*`

The command center for the organization, accessible only to users with role `HR`.

### 3.1. Dashboard Overview (`HRDashboard.tsx`)
*   **Statistics:** Real-time metrics for Total Employees, Pending Approvals, Active Sites, and Client Companies.
*   **Navigation:** Sidebar (Desktop) and Drawer (Mobile) for easy access to sub-modules.

### 3.2. Company Branding (`CompanyProfile.tsx`)
*   **Purpose:** White-label the application.
*   **Features:**
    *   **Portal Branding:** Upload Logo and Favicon (updates browser tab instantly).
    *   **Document Branding:** Upload **Official Stamp** and **Authorized Signature**. These assets are dynamically overlaid on generated PDF payslips.

### 3.3. Site Management (`SiteManagement.tsx`)
*   **Purpose:** Manage remote work locations.
*   **Workflow:**
    *   HR creates a Site (Name, Code, Address).
    *   **Linking:** HR assigns a "Site Incharge" (Manager) to the site.
    *   **Operations:** Sites can be edited or closed (Soft Delete).

### 3.4. Staff Directory (`EmployeeDirectory.tsx`)
*   **Purpose:** Searchable database of all workforce.
*   **Features:**
    *   **Filtering:** Filter by Site (Location) or Job Role.
    *   **Search:** Instant search by Name or UAN.
    *   **Export:** Generates an Excel (`.xlsx`) report of the filtered view.
    *   **Profile View:** Opens `EmployeeDetailModal` to view docs and salary history.

### 3.5. Approvals (`PendingApprovals.tsx`)
*   **Workflow:**
    1.  Site Incharge registers a worker -> Status is `PENDING`.
    2.  Worker appears in HR's "Approvals" tab.
    3.  HR reviews details and clicks **Approve**.
    4.  Status updates to `APPROVED`, enabling the worker to login.

### 3.6. Job Roles (`JobRoleManagement.tsx`)
*   **Purpose:** Dynamic configuration of designations.
*   **System Roles:** Roles like 'Supervisor', 'Driver', 'Helper' are protected system defaults.
*   **Custom Roles:** HR can add new roles (e.g., 'Electrician') which immediately appear in onboarding forms.

### 3.7. Payroll Processing (`SalaryProcessing.tsx`)
*   **Purpose:** Bulk salary generation.
*   **Workflow:**
    1.  **Context:** HR selects Site, Month, and Year.
    2.  **Template:** System generates an Excel template with columns for UAN, Basic, HRA, Allowances, Deductions.
    3.  **Upload:** HR uploads the filled Excel file.
    4.  **Processing:** System parses file, validates UANs, and performs **Bulk Upsert** into `salary_records` table.

---

## 4. Site Incharge Module
**Files:** `components/Site/*`

Operational interface for field managers (Role: `SITE_INCHARGE`).

### 4.1. Site Dashboard
*   **Stats:** View total strength and compliance percentage for their specific site.
*   **Roster:** List of all employees tagged to the site with status badges.

### 4.2. Digital Onboarding (`NewEmployeeForm.tsx`)
*   **Purpose:** Register new workers directly from the field.
*   **Data Collection:**
    *   **Identity:** Name, UAN (12-digit), Mobile.
    *   **Job:** Role selection (fed from HR configuration).
    *   **Financial:** Bank Account, IFSC, PF, ESIC.
*   **Document Digitization:**
    *   Uploads photos of **Aadhaar (Front/Back)**, **PAN Card**, **Bank Passbook**, and **Profile Photo**.
    *   Files are stored (mocked as base64/blob URLs in current build) and linked to the profile.

---

## 5. Employee Module
**Files:** `components/Employee/*`

Self-service portal for staff (Role: `EMPLOYEE`).

### 5.1. Profile View
*   View personal details, bank status, and compliance numbers (PF/ESIC).

### 5.2. Payslip Generation (`SalarySlip.tsx`)
*   **Core Feature:** On-demand PDF generation.
*   **Process:**
    1.  User selects Month/Year.
    2.  System fetches salary record + Company Branding + Employee Details.
    3.  **Rendering:** React component renders a compliant payslip layout.
    4.  **Logic:** Calculates **Net Payable** and converts the amount to words (e.g., "Fifteen Thousand Only").
    5.  **Watermarking:** Applies Company Logo as a background watermark and overlays Official Stamp/Signature.
    6.  **Download:** Uses `html2canvas` to capture the view and `jspdf` to download as a high-quality PDF.

---

## 6. Database Schema
**File:** `db_schema.sql`

The system relies on a relational PostgreSQL schema:

1.  **`companies`**: Root entity. Stores branding URLs.
2.  **`sites`**: Linked to Company.
3.  **`users`**: HR credentials (email/password).
4.  **`employees`**: The workforce. **PK: UAN**.
5.  **`salary_records`**: Financial data linked to UAN + Month + Year.
6.  **`audit_logs`**: Tracks critical actions (Logins, Approvals, Data Uploads).

## 7. Global Services
**File:** `services/mockDb.ts`

*   **Abstraction Layer:** All database calls go through `dbService`.
*   **Mock Mode:** Automatically detects if Supabase credentials are missing and switches to an in-memory mock database to ensure the app is always testable/demoable.
*   **Error Handling:** Catches connectivity issues and surfaces user-friendly error messages via the UI notification system.
