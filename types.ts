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
  SAFETY = 'Safety Officer',
  OTHER = 'Other',
}

export interface Company {
  id: string;
  clientId: string;
  name: string;
  logoUrl: string;
  email?: string;
  mobile?: string;
  address?: string;
}

export interface Site {
  id: string;
  companyId: string;
  name: string;
  siteCode?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  email?: string;
  mobile?: string;
  managerName?: string;
  managerMobile?: string;
  status: SiteStatus;
  logoUrl?: string;
}

// Unified User Session Interface
export interface User {
  id: string; // UUID (HR) or UAN (Staff)
  identityType: 'UUID' | 'UAN';
  email?: string;
  name: string;
  role: UserRole;
  companyId?: string;
  siteId?: string;
}

export interface Employee {
  uan: string; // Primary Key (12-digit)
  name: string;
  role: EmployeeRole;
  companyId: string;
  siteId: string;
  status: EmployeeStatus;
  addedBy: string; // UAN or UUID
  joinedDate: string;
}

// Raw Record in DB
export interface SalaryRecord {
  id: string;
  employeeUan: string; // Foreign Key to Employee UAN
  siteId: string; // Foreign Key to Site
  month: number;
  year: number;
  basic: number;
  hra: number;
  allowances: number;
  pfDeduction: number;
  taxDeduction: number;
  netSalary: number; // Persisted calculated field
  isLocked: boolean;
}

// Computed View from DB (Kept for backward compat if needed, but logic moved to Record)
export interface SalaryView extends SalaryRecord {
  // netSalary is now in SalaryRecord
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string; // UUID or UAN
  action: string;
  target: string;
  details: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'SUCCESS';
  isRead: boolean;
  timestamp: string;
}

export interface SystemConfig {
  allowSiteClosures: boolean;
  requireTwoFactor: boolean;
  autoLockSalary: boolean;
  emailAlerts: boolean;
}