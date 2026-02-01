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

export interface Client {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  clientId: string;
  name: string;
  logoUrl: string; // Placeholder URL
}

export interface Site {
  id: string;
  companyId: string;
  name: string;
  siteCode?: string; // New
  
  // Location
  address: string;
  city?: string;
  state?: string;
  pincode?: string; // New
  
  // Site Contact
  email?: string;
  mobile?: string; // Site Office Mobile
  
  // Manager Contact
  managerName?: string; // New (replaces contactPerson)
  managerMobile?: string; // New
  
  status: SiteStatus;
  logoUrl?: string;
}

export interface User {
  id: string;
  uan: string; // Used as login ID for non-HR
  email?: string; // Used as login for HR
  password?: string; // In real app, hashed
  name: string;
  role: UserRole;
  companyId?: string; // Linked company
  siteId?: string; // Linked site (for Incharge/Employee)
}

export interface Employee {
  id: string;
  uan: string;
  name: string;
  role: EmployeeRole;
  companyId: string;
  siteId: string;
  status: EmployeeStatus;
  addedBy: string; // Site Incharge ID
  joinedDate: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  month: number; // 1-12
  year: number;
  basic: number;
  hra: number;
  allowances: number;
  pfDeduction: number;
  taxDeduction: number;
  netSalary: number;
  isLocked?: boolean; // Level 2: Prevent edits after finalization
}

export interface Document {
  id: string;
  employeeId: string;
  type: 'AADHAAR' | 'PAN' | 'BANK' | 'PHOTO';
  fileName: string;
  expiryDate?: string; // Level 2: Compliance tracking
}

// --- LEVEL 2: ENTERPRISE TYPES ---

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  target: string;
  details: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

export interface Notification {
  id: string;
  userId: string; // 'ALL' or specific user ID
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