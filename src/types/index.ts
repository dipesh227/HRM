export enum UserRole {
  HR = 'HR',
  SITE_INCHARGE = 'SITE_INCHARGE',
  EMPLOYEE = 'EMPLOYEE',
}

export enum SiteStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum EmployeeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INACTIVE = 'INACTIVE',
}

export enum EmployeeRole {
  SUPERVISOR = 'Supervisor',
  DRIVER = 'Driver',
  HELPER = 'Helper',
  SAFETY_OFFICER = 'Safety Officer',
  OTHER = 'Other',
}

export interface Company {
  id: string;
  client_id?: string;
  name: string;
  logo_url?: string;
  email?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  gst_number?: string;
  pan_number?: string;
}

export interface Site {
  id: string;
  company_id: string;
  name: string;
  site_code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
  mobile: string;
  manager_name: string;
  manager_mobile: string;
  status: SiteStatus;
}

export interface Employee {
  id: string;
  uan: string;
  name: string;
  role: EmployeeRole;
  company_id: string;
  site_id: string;
  status: EmployeeStatus;
  added_by: string; // User ID of Site Incharge
  joined_date: string; // Date string
}

export interface SalaryRecord {
  id: string;
  employee_id: string;
  month: number; // 1-12
  year: number;
  basic: number;
  hra: number;
  allowances: number;
  pf_deduction: number;
  tax_deduction: number;
  net_salary: number;
  is_locked: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_name: string;
  action: string;
  target: string;
  details: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

// Extended User type to include HRM specific fields
export interface HRMUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_id?: string;
  site_id?: string;
  uan?: string;
}