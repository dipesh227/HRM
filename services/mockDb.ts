import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserRole, SiteStatus, EmployeeStatus, EmployeeRole, 
  User, Company, Site, Employee, SalaryRecord, SalaryView,
  AuditLog, Notification, JobRole
} from '../types';

// ============================================================================
// CONFIGURATION & SECURITY UTILS
// ============================================================================

const getEnv = (key: string) => {
  // @ts-ignore
  return (import.meta.env && import.meta.env[key]) ? import.meta.env[key] : '';
};

// Input Sanitization
const sanitize = (input: any): any => {
    if (typeof input === 'string') {
        return input.replace(/['";]/g, '').trim(); 
    }
    if (typeof input === 'object' && input !== null) {
        Object.keys(input).forEach(key => {
            input[key] = sanitize(input[key]);
        });
    }
    return input;
};

// UUID Helper: Converts empty strings to NULL for Postgres UUID fields
// Fixes "invalid input syntax for type uuid" error
const toUUID = (id?: string | null) => {
    if (!id || id.trim() === '') return null;
    return id;
};

// Credentials
const DEFAULT_URL = "https://aqfcbijhvdbwlqrvmrxa.supabase.co";
const DEFAULT_KEY = "sb_publishable_uYPotcTGMSAcM4BgDPN_HQ_KyE-fFYg";

let SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || DEFAULT_URL;
if (SUPABASE_URL && SUPABASE_URL.endsWith('/')) {
    SUPABASE_URL = SUPABASE_URL.slice(0, -1);
}
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY') || DEFAULT_KEY;

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage },
            db: { schema: 'public' },
            global: { headers: { 'x-application-name': 'konark-hr-secure' } }
        });
    } catch (e) {
        console.error("Critical: Failed to initialize Supabase client", e);
    }
}

export type ConnectionStatus = { connected: boolean; error?: string; code?: string; usingMock?: boolean; };

// --- MOCK DATA STORE (Fallback) ---
const MOCK_DB = {
    companies: [{ id: 'c1', clientId: 'KONARK001', name: 'Konark Enterprises Pvt. Ltd.', logoUrl: 'https://via.placeholder.com/150', email: 'info@konark.com', mobile: '9988776655', address: 'Pune, India' }] as Company[],
    sites: [{ id: 's1', companyId: 'c1', name: 'Konark Site - Pune HQ', siteCode: 'KE-PUN-01', address: 'Plot 45, Infotech Park', city: 'Pune', state: 'MH', status: SiteStatus.ACTIVE }] as Site[],
    job_roles: [
        { id: 'r1', title: 'Supervisor', description: 'Site Manager', isSystemDefault: true },
        { id: 'r2', title: 'Driver', description: 'Vehicle Operator', isSystemDefault: true },
        { id: 'r3', title: 'Helper', description: 'General Assistant', isSystemDefault: true },
        { id: 'r4', title: 'Safety Officer', description: 'Site Safety', isSystemDefault: true },
        { id: 'r5', title: 'Other', description: 'General', isSystemDefault: true }
    ] as JobRole[],
    employees: [
        { uan: '100000000001', name: 'Rajesh Kumar', role: 'Supervisor', companyId: 'c1', siteId: 's1', status: EmployeeStatus.APPROVED, addedBy: 'SYSTEM', joinedDate: '2024-01-01', mobile: '9876543210' },
        { uan: '100000000002', name: 'Sunil Patil', role: 'Driver', companyId: 'c1', siteId: 's1', status: EmployeeStatus.APPROVED, addedBy: 'SYSTEM', joinedDate: '2024-01-15', mobile: '9876543211' }
    ] as Employee[],
    salary_records: [] as SalaryRecord[],
    audit_logs: [] as AuditLog[],
    notifications: [] as Notification[]
};

class DBService {
  private mockMode = false;
  
  async checkConnection(): Promise<ConnectionStatus> {
      if (!supabase) { this.mockMode = true; return { connected: true, usingMock: true }; }
      try {
          const { error } = await supabase.from('v_companies_decrypted').select('count', { count: 'exact', head: true });
          if (error) { 
            if (error.code === 'PGRST301') return { connected: true }; 
            return { connected: false, error: error.message, code: error.code };
          }
          return { connected: true };
      } catch (e: any) {
          console.warn("DB Connection Failed. Switching to Mock Mode.", e.message);
          this.mockMode = true;
          return { connected: true, usingMock: true, error: "Running in Dev Mode" };
      }
  }

  private get client(): SupabaseClient {
      if (!supabase) throw new Error("Database client not initialized");
      return supabase;
  }

  // --- SECURE AUTHENTICATION ---
  
  async loginHR(email: string, password: string): Promise<User> {
    if (this.mockMode) {
        if (email === 'admin@konark.com' && password === 'Hr@12345') {
            return { id: 'mock-hr-id', identityType: 'UUID', email: email, name: 'System Admin (Mock)', role: UserRole.HR, companyId: 'c1' };
        }
        throw new Error("Invalid Credentials.");
    }

    try {
        const cleanEmail = sanitize(email);
        const { data, error } = await this.client.rpc("secure_hr_login", {
          p_email: cleanEmail,
          p_password: password
        });

        if (error || !data || data.length === 0) throw new Error("Invalid email or password");

        const userData = data[0];
        await this.logAudit(userData.id, 'LOGIN_SUCCESS', 'Auth', 'HR Secure Session');
        
        return {
            id: userData.id,
            identityType: 'UUID',
            email: cleanEmail,
            name: userData.name, 
            role: userData.role as UserRole,
            companyId: userData.company_id
        };
    } catch (err: any) {
        throw new Error("Authentication failed.");
    }
  }

  async loginStaff(uan: string): Promise<User> {
      const cleanUan = sanitize(uan.trim());
      if (this.mockMode) { return MOCK_DB.employees[0] as any; }

      const { data: emp, error } = await this.client
          .from('v_employees_decrypted')
          .select('*')
          .eq('uan', cleanUan)
          .maybeSingle();

      if (error || !emp) throw new Error("Invalid UAN.");
      if (emp.status !== EmployeeStatus.APPROVED) throw new Error(`Status: ${emp.status}`);

      let sysRole = UserRole.EMPLOYEE;
      if (['Supervisor', 'Safety Officer'].includes(emp.role)) sysRole = UserRole.SITE_INCHARGE;

      return {
          id: emp.uan,
          identityType: 'UAN',
          name: emp.name, 
          role: sysRole,
          companyId: emp.company_id,
          siteId: emp.site_id
      };
  }

  // --- SECURE DATA ACCESS ---

  async getAllSites(): Promise<Site[]> {
    if (this.mockMode) return [...MOCK_DB.sites];
    const { data, error } = await this.client.from('v_sites_decrypted').select('*').order('name');
    if (error) throw error;
    return (data || []).map(this.mapSite);
  }

  async getAllEmployees(): Promise<Employee[]> {
    if (this.mockMode) return [...MOCK_DB.employees];
    const { data, error } = await this.client.from('v_employees_decrypted').select('*').order('joined_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(this.mapEmployee);
  }

  async getEmployeeByUAN(uan: string): Promise<Employee | undefined> {
      if (this.mockMode) return MOCK_DB.employees.find(e => e.uan === uan);
      const { data, error } = await this.client.from('v_employees_decrypted').select('*').eq('uan', uan).maybeSingle();
      if (error || !data) return undefined;
      return this.mapEmployee(data);
  }

  async getPendingEmployees(): Promise<Employee[]> {
    if (this.mockMode) return MOCK_DB.employees.filter(e => e.status === EmployeeStatus.PENDING);
    const { data } = await this.client.from('v_employees_decrypted').select('*').eq('status', 'PENDING');
    return (data || []).map(this.mapEmployee);
  }

  async getSiteEmployees(siteId: string): Promise<Employee[]> {
      if (this.mockMode) return MOCK_DB.employees.filter(e => e.siteId === siteId);
      const { data } = await this.client.from('v_employees_decrypted').select('*').eq('site_id', siteId);
      return (data || []).map(this.mapEmployee);
  }

  // --- SECURE DATA INSERTION (RPCs) ---

  async addEmployee(emp: Employee): Promise<void> {
      if (this.mockMode) { MOCK_DB.employees.push(emp); return; }
      
      const { error } = await this.client.rpc('secure_upsert_employee', {
          p_uan: emp.uan,
          p_name: emp.name,
          p_role: emp.role,
          p_company_id: toUUID(emp.companyId), // Fixed: Use toUUID to prevent empty string error
          p_site_id: toUUID(emp.siteId),       // Fixed: Use toUUID to prevent empty string error
          p_added_by: emp.addedBy,
          p_mobile: emp.mobile || '',
          p_address: emp.address || '',
          p_email: emp.personalEmail || '',
          p_bank_ac: emp.bankAccountNo || '',
          p_ifsc: emp.ifscCode || '',
          p_bank_name: emp.bankName || '',
          p_esic: emp.esicNo || '', // Added
          p_pf: emp.pfNo || ''      // Added
      });

      if (error) throw new Error("Failed to add employee: " + error.message);
      await this.logAudit(emp.addedBy, 'EMP_CREATE', emp.uan, 'Secure Onboarding');
  }

  // --- UPDATE EMPLOYEE PROFILE (Merge & Update) ---
  async updateEmployeeProfile(uan: string, data: Partial<Employee>) { 
      if (this.mockMode) return;

      // 1. Fetch Existing Record to prevent overwriting with nulls
      const existing = await this.getEmployeeByUAN(uan);
      if (!existing) throw new Error("Employee not found");

      // 2. Merge existing with updates
      const merged = { ...existing, ...data };

      // 3. Call RPC with fully merged object
      const { error } = await this.client.rpc('secure_upsert_employee', {
          p_uan: merged.uan,
          p_name: merged.name,
          p_role: merged.role,
          p_company_id: toUUID(merged.companyId),
          p_site_id: toUUID(merged.siteId),
          p_added_by: merged.addedBy,
          p_mobile: merged.mobile || '',
          p_address: merged.address || '',
          p_email: merged.personalEmail || '',
          p_bank_ac: merged.bankAccountNo || '',
          p_ifsc: merged.ifscCode || '',
          p_bank_name: merged.bankName || '',
          p_esic: merged.esicNo || '', // Added
          p_pf: merged.pfNo || ''      // Added
      });

      if (error) throw new Error("Update failed: " + error.message);
      await this.logAudit(existing.addedBy || 'SYSTEM', 'EMP_UPDATE', uan, 'Profile Updated');
  }

  // --- SALARY ---

  async upsertSingleSalary(record: SalaryRecord, actorId: string): Promise<void> {
      if (this.mockMode) return;
      
      const { error } = await this.client.rpc('secure_upsert_salary', {
        p_uan: record.employeeUan,
        p_site_id: toUUID(record.siteId), // Fixed: Use toUUID
        p_month: record.month,
        p_year: record.year,
        p_basic: record.basic,
        p_hra: record.hra,
        p_allowances: record.allowances,
        p_pf: record.pfDeduction,
        p_tax: record.taxDeduction
      });

      if (error) throw new Error("Failed to save salary: " + error.message);
      await this.logAudit(actorId, 'SALARY_UPDATE', record.employeeUan, `${record.month}/${record.year}`);
  }
  
  async getEmployeeSalaryView(uan: string, month: number, year: number): Promise<SalaryView | undefined> {
      if (this.mockMode) return undefined;
      
      const { data, error } = await this.client
        .from('v_salary_decrypted')
        .select('*')
        .eq('employee_uan', uan)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return undefined;
      
      return {
          id: data.id,
          employeeUan: data.employee_uan,
          siteId: data.site_id,
          month: data.month,
          year: data.year,
          basic: Number(data.basic),
          hra: Number(data.hra),
          allowances: Number(data.allowances),
          pfDeduction: Number(data.pf_deduction),
          taxDeduction: Number(data.tax_deduction),
          netSalary: Number(data.net_salary),
          isLocked: data.is_locked
      };
  }
  
  async getEmployeeSalaryHistory(uan: string): Promise<{id: string, month: number, year: number}[]> {
    if (this.mockMode) return [];
    const { data, error } = await this.client
        .from('v_salary_decrypted')
        .select('id, month, year')
        .eq('employee_uan', uan)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
        
    if (error) throw error;
    return data || [];
  }
  
  async uploadSalaryData(recs: SalaryRecord[], actorId: string) {
    if (this.mockMode) return { processed: recs.length, skipped: 0 };
    
    let processed = 0;
    let errors = 0;
    for (const rec of recs) {
        try {
            await this.upsertSingleSalary(rec, actorId);
            processed++;
        } catch (e) {
            console.error("Failed to process salary record", e);
            errors++;
        }
    }
    return { processed, skipped: errors };
  }

  // --- GENERIC GETTERS ---
  async getHRStats() {
    if (this.mockMode) return { totalCompanies: 1, totalSites: 1, activeSites: 1, pendingApprovals: 0, totalEmployees: 2 };
    
    const [c, s, e, p] = await Promise.all([
        this.client.from('v_companies_decrypted').select('*', { count: 'exact', head: true }),
        this.client.from('v_sites_decrypted').select('*', { count: 'exact', head: true }),
        this.client.from('v_employees_decrypted').select('*', { count: 'exact', head: true }),
        this.client.from('v_employees_decrypted').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')
    ]);
    
    return {
      totalCompanies: c.count || 0,
      totalSites: s.count || 0,
      activeSites: s.count || 0,
      pendingApprovals: p.count || 0,
      totalEmployees: e.count || 0
    };
  }
  
  async getCompanyDetails(id: string): Promise<Company | undefined> {
      if (this.mockMode) return MOCK_DB.companies[0];
      const { data } = await this.client.from('v_companies_decrypted').select('*').eq('id', id).maybeSingle();
      if (!data) return undefined;
      return { 
          id: data.id, clientId: data.client_id, name: data.name, logoUrl: data.logo_url,
          email: data.email, mobile: data.mobile, address: data.address,
          signatureUrl: data.signature_url, stampUrl: data.stamp_url,
          faviconUrl: data.favicon_url, metaTitle: data.meta_title, metaDescription: data.meta_description
      };
  }

  async getSiteDetails(siteId: string): Promise<Site | undefined> {
      if (this.mockMode) return MOCK_DB.sites[0];
      const { data } = await this.client.from('v_sites_decrypted').select('*').eq('id', siteId).maybeSingle();
      return data ? this.mapSite(data) : undefined;
  }
  
  async getJobRoles(): Promise<JobRole[]> {
      if (this.mockMode) return MOCK_DB.job_roles;
      const { data } = await this.client.from('job_roles').select('*');
      return data || [];
  }
  
  async addJobRole(title: string, description: string): Promise<void> {
      await this.client.from('job_roles').insert({ title, description });
  }
  
  async deleteJobRole(id: string): Promise<void> {
      await this.client.from('job_roles').delete().eq('id', id);
  }

  // --- LOGGING ---
  async getAuditLogs(): Promise<AuditLog[]> {
      if (this.mockMode) return MOCK_DB.audit_logs;
      const { data } = await this.client.from('audit_logs').select('*').order('timestamp', { ascending: false });
      return (data || []).map((l:any) => ({ id: l.id, timestamp: l.timestamp, actorId: l.actor_id, action: l.action, target: l.target, details: l.details, severity: l.severity }));
  }
  
  private async logAudit(actorId: string, action: string, target: string, details: string) {
      if (!this.mockMode) await this.client.from('audit_logs').insert({ actor_id: actorId, action, target, details });
  }

  // --- COMMON HELPERS ---
  
  private mapSite(s: any): Site {
    return {
        id: s.id, companyId: s.company_id, name: s.name, siteCode: s.site_code,
        address: s.address, city: s.city, state: s.state, pincode: s.pincode,
        email: s.email, mobile: s.mobile, managerName: s.manager_name, managerMobile: s.manager_mobile,
        status: s.status, logoUrl: s.logo_url
    };
  }

  private mapEmployee(e: any): Employee {
      return {
          uan: e.uan, name: e.name, role: e.role, companyId: e.company_id, siteId: e.site_id,
          status: e.status, addedBy: e.added_by, joinedDate: e.joined_date,
          profilePhotoUrl: e.profile_photo_url,
          personalEmail: e.personal_email, mobile: e.mobile, address: e.address,
          esicNo: e.esic_no, pfNo: e.pf_no, bankAccountNo: e.bank_account_no,
          ifscCode: e.ifsc_code, bankName: e.bank_name,
          aadhaarFrontUrl: e.aadhaar_front_url, aadhaarBackUrl: e.aadhaar_back_url,
          panUrl: e.pan_url, bankPassbookUrl: e.bank_passbook_url
      };
  }
  
  async updateHRProfile(uid: string, data: any) { 
       // Placeholder - Extend if needed
  }

  async updateCompanyProfile(cid: string, data: any) { 
       // Placeholder - Extend if needed
  }

  async uploadSiteLogo(file: File) { 
      // Mock upload - in prod use Supabase Storage
      return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
      });
  }

  async createSite(data: any) {
       await this.client.from('sites').insert({
           company_id: toUUID(data.companyId),
           name: pgp_encrypt(data.name), 
           site_code: data.siteCode,
           address: pgp_encrypt(data.address),
           city: data.city,
           state: data.state,
           pincode: data.pincode,
           logo_url: data.logoUrl
       });
  }

  async updateSite(sid: string, data: any) { 
       // Placeholder
  }
  async deleteSite(sid: string) { 
      await this.client.from('sites').delete().eq('id', sid);
  }

  async approveEmployee(uan: string, app: boolean, aid: string) { 
      await this.client.from('employees').update({ status: app ? 'APPROVED' : 'REJECTED' }).eq('uan', uan); 
  }

  async deleteSalaryRecord(id: string, aid: string) { 
      await this.client.from('salary_records').delete().eq('id', id);
  }

  async getNotifications(uid: string) { return []; }
}

// Client-side helper for encryption simulation if needed (not used in secure RPC flow)
const pgp_encrypt = (val: string) => val; 

export const dbService = new DBService();
