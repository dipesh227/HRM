
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

// Kept for backward compatibility references, but system now supports dynamic strings
export enum EmployeeRole {
  SUPERVISOR = 'Supervisor',
  DRIVER = 'Driver',
  HELPER = 'Helper',
  SAFETY = 'Safety Officer',
  OTHER = 'Other',
}

export interface JobRole {
    id: string;
    title: string;
    description?: string;
    isSystemDefault?: boolean; // If true, cannot be deleted (e.g., Supervisor)
}

export interface Company {
  id: string;
  clientId: string;
  name: string;
  logoUrl: string;
  signatureUrl?: string; 
  stampUrl?: string;     
  email?: string;
  mobile?: string;
  address?: string;
  // Portal Branding
  faviconUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
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
  role: string; // Dynamic Role
  companyId: string;
  siteId: string;
  status: EmployeeStatus;
  addedBy: string; // UAN or UUID
  joinedDate: string;
  
  // Contact
  profilePhotoUrl?: string;
  personalEmail?: string;
  mobile?: string;
  address?: string;

  // Compliance
  esicNo?: string;
  pfNo?: string;

  // Banking
  bankAccountNo?: string;
  ifscCode?: string;
  bankName?: string;

  // Documents (URLs)
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  panUrl?: string;
  bankPassbookUrl?: string;
}

// Raw Record in DB
export interface SalaryRecord {
  id: string;
  employeeUan: string; 
  siteId: string; 
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