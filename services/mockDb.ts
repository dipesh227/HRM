import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserRole, SiteStatus, EmployeeStatus, EmployeeRole, 
  User, Company, Site, Employee, SalaryRecord, SalaryView,
  AuditLog, Notification, JobRole
} from '../types';

// ============================================================================
// CONFIGURATION & UTILS
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
            global: { headers: { 'x-application-name': 'konark-hr-standard' } }
        });
    } catch (e) {
        console.error("Critical: Failed to initialize Supabase client", e);
    }
}

export type ConnectionStatus = { connected: boolean; error?: string; code?: string; usingMock?: boolean; };

// --- MOCK DATA STORE (Fallback ONLY) ---
const MOCK_DB = {
    companies: [{ id: 'c1', clientId: 'KONARK001', name: 'Konark Enterprises Pvt. Ltd.', logoUrl: 'https://via.placeholder.com/150', email: 'info@konark.com', mobile: '9988776655', address: 'Pune, India' }] as Company[],
    sites: [{ id: 's1', companyId: 'c1', name: 'Konark Site - Pune HQ', siteCode: 'KE-PUN-01', address: 'Plot 45, Infotech Park', city: 'Pune', state: 'MH', status: SiteStatus.ACTIVE }] as Site[],
    job_roles: [
        { id: 'r1', title: 'Supervisor', description: 'Site Manager', isSystemDefault: true },
        { id: 'r2', title: 'Driver', description: 'Vehicle Operator', isSystemDefault: true },
        { id: 'r3', title: 'Helper', description: 'General Assistant', isSystemDefault: true },
    ] as JobRole[],
    employees: [] as Employee[],
    salary_records: [] as SalaryRecord[],
    audit_logs: [] as AuditLog[],
    notifications: [] as Notification[]
};

class DBService {
  private mockMode = false;
  
  async checkConnection(): Promise<ConnectionStatus> {
      if (!supabase) { this.mockMode = true; return { connected: true, usingMock: true }; }
      try {
          // Changed to check base table 'companies' instead of encrypted view
          const { error } = await supabase.from('companies').select('count', { count: 'exact', head: true });
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

  // --- AUTHENTICATION ---
  
  async loginHR(email: string, password: string): Promise<User> {
    if (this.mockMode) {
        if (email === 'admin@konark.com' && password === 'Hr@12345') {
            return { id: 'mock-hr-id', identityType: 'UUID', email: email, name: 'System Admin (Mock)', role: UserRole.HR, companyId: 'c1' };
        }
        throw new Error("Invalid Credentials.");
    }

    try {
        const cleanEmail = sanitize(email);
        // Changed RPC to 'hr_login'
        const { data, error } = await this.client.rpc("hr_login", {
          p_email: cleanEmail,
          p_password: password
        });

        if (error || !data || data.length === 0) throw new Error("Invalid email or password");

        const userData = data[0];
        await this.logAudit(userData.id, 'LOGIN_SUCCESS', 'Auth', 'HR Session');
        
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

      // Query 'employees' table directly
      const { data: emp, error } = await this.client
          .from('employees')
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

  // --- DATA ACCESS ---

  async getAllSites(): Promise<Site[]> {
    if (this.mockMode) return [...MOCK_DB.sites];
    // Query 'sites' table directly
    const { data, error } = await this.client.from('sites').select('*').order('name');
    if (error) throw error;
    return (data || []).map(this.mapSite);
  }

  async getAllEmployees(): Promise<Employee[]> {
    if (this.mockMode) return [...MOCK_DB.employees];
    // Query 'employees' table directly
    const { data, error } = await this.client.from('employees').select('*').order('joined_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(this.mapEmployee);
  }

  async getEmployeeByUAN(uan: string): Promise<Employee | undefined> {
      if (this.mockMode) return MOCK_DB.employees.find(e => e.uan === uan);
      const { data, error } = await this.client.from('employees').select('*').eq('uan', uan).maybeSingle();
      if (error || !data) return undefined;
      return this.mapEmployee(data);
  }

  async getPendingEmployees(): Promise<Employee[]> {
    if (this.mockMode) return MOCK_DB.employees.filter(e => e.status === EmployeeStatus.PENDING);
    const { data } = await this.client.from('employees').select('*').eq('status', 'PENDING');
    return (data || []).map(this.mapEmployee);
  }

  async getSiteEmployees(siteId: string): Promise<Employee[]> {
      if (this.mockMode) return MOCK_DB.employees.filter(e => e.siteId === siteId);
      const { data } = await this.client.from('employees').select('*').eq('site_id', siteId);
      return (data || []).map(this.mapEmployee);
  }

  // --- DATA INSERTION (RPCs) ---

  async addEmployee(emp: Employee): Promise<void> {
      if (this.mockMode) { MOCK_DB.employees.push(emp); return; }
      
      // Changed RPC to 'upsert_employee'
      const { error } = await this.client.rpc('upsert_employee', {
          p_uan: emp.uan,
          p_name: emp.name,
          p_role: emp.role,
          p_company_id: toUUID(emp.companyId), 
          p_site_id: toUUID(emp.siteId),
          p_added_by: emp.addedBy,
          p_mobile: emp.mobile || '',
          p_address: emp.address || '',
          p_email: emp.personalEmail || '',
          p_bank_ac: emp.bankAccountNo || '',
          p_ifsc: emp.ifscCode || '',
          p_bank_name: emp.bankName || '',
          p_esic: emp.esicNo || '',
          p_pf: emp.pfNo || ''
      });

      if (error) throw new Error("Failed to add employee: " + error.message);
      await this.logAudit(emp.addedBy, 'EMP_CREATE', emp.uan, 'Onboarding');
  }

  async updateEmployeeProfile(uan: string, data: Partial<Employee>) { 
      if (this.mockMode) return;
      const existing = await this.getEmployeeByUAN(uan);
      if (!existing) throw new Error("Employee not found");
      const merged = { ...existing, ...data };
      await this.addEmployee(merged); // Upsert handles update
  }

  // --- SITE MANAGEMENT (CRUD) ---

  async createSite(data: Partial<Site>): Promise<void> {
      if (this.mockMode) {
          const newSite = { ...data, id: `s${Date.now()}`, status: SiteStatus.ACTIVE } as Site;
          MOCK_DB.sites.push(newSite);
          return;
      }
      
      // Changed RPC to 'upsert_site'
      const { error } = await this.client.rpc('upsert_site', {
          p_id: null, // Insert mode
          p_company_id: toUUID(data.companyId),
          p_name: data.name,
          p_site_code: data.siteCode || '',
          p_address: data.address,
          p_city: data.city || '',
          p_state: data.state || '',
          p_pincode: data.pincode || '',
          p_logo_url: data.logoUrl || '',
          p_manager_name: data.managerName || '',
          p_manager_mobile: data.managerMobile || ''
      });

      if (error) throw new Error("Failed to create site: " + error.message);
  }

  async updateSite(siteId: string, data: Partial<Site>): Promise<void> {
       if (this.mockMode) return;
       
       const { error } = await this.client.rpc('upsert_site', {
          p_id: siteId, // Update mode
          p_company_id: toUUID(data.companyId),
          p_name: data.name,
          p_site_code: data.siteCode || '',
          p_address: data.address,
          p_city: data.city || '',
          p_state: data.state || '',
          p_pincode: data.pincode || '',
          p_logo_url: data.logoUrl || '',
          p_manager_name: data.managerName || '',
          p_manager_mobile: data.managerMobile || ''
      });

      if (error) throw new Error("Failed to update site: " + error.message);
  }

  async deleteSite(siteId: string): Promise<void> {
      if (this.mockMode) { MOCK_DB.sites = MOCK_DB.sites.filter(s => s.id !== siteId); return; }
      
      const { error } = await this.client.from('sites').delete().eq('id', siteId);
      if (error) throw new Error("Failed to delete site: " + error.message);
  }

  // --- JOB ROLE MANAGEMENT ---

  async getJobRoles(): Promise<JobRole[]> {
      if (this.mockMode) return MOCK_DB.job_roles;
      
      const { data, error } = await this.client.from('job_roles').select('*').order('title');
      if (error) throw error;
      return data || [];
  }
  
  async addJobRole(title: string, description: string): Promise<void> {
      if (this.mockMode) {
          MOCK_DB.job_roles.push({ id: `r${Date.now()}`, title, description, isSystemDefault: false });
          return;
      }
      
      const { error } = await this.client.from('job_roles').insert({ title, description });
      if (error) throw new Error("Failed to add role: " + error.message);
  }
  
  async deleteJobRole(id: string): Promise<void> {
      if (this.mockMode) {
          MOCK_DB.job_roles = MOCK_DB.job_roles.filter(r => r.id !== id);
          return;
      }
      
      const { error } = await this.client.from('job_roles').delete().eq('id', id);
      if (error) throw new Error("Failed to delete role: " + error.message);
  }

  // --- SALARY ---

  async upsertSingleSalary(record: SalaryRecord, actorId: string): Promise<void> {
      if (this.mockMode) return;
      
      // Changed RPC to 'upsert_salary'
      const { error } = await this.client.rpc('upsert_salary', {
        p_uan: record.employeeUan,
        p_site_id: toUUID(record.siteId),
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
      
      // Query 'salary_records' table directly
      const { data, error } = await this.client
        .from('salary_records')
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
    // Query 'salary_records' table directly
    const { data, error } = await this.client
        .from('salary_records')
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
    
    // Query base tables directly
    const [c, s, e, p] = await Promise.all([
        this.client.from('companies').select('*', { count: 'exact', head: true }),
        this.client.from('sites').select('*', { count: 'exact', head: true }),
        this.client.from('employees').select('*', { count: 'exact', head: true }),
        this.client.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')
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
      // Query 'companies' table directly
      const { data } = await this.client.from('companies').select('*').eq('id', id).maybeSingle();
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
      // Query 'sites' table directly
      const { data } = await this.client.from('sites').select('*').eq('id', siteId).maybeSingle();
      return data ? this.mapSite(data) : undefined;
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

  // --- HELPERS (Updated to handle snake_case from DB directly) ---
  
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
      if (this.mockMode) return;
      const { error } = await this.client.from('companies').update({
          name: data.name,
          email: data.email,
          mobile: data.mobile,
          address: data.address,
          logo_url: data.logoUrl,
          signature_url: data.signatureUrl,
          stamp_url: data.stampUrl,
          favicon_url: data.faviconUrl,
          meta_title: data.metaTitle,
          meta_description: data.metaDescription
      }).eq('id', cid);
      if (error) throw error;
  }

  async uploadSiteLogo(file: File) { 
      // Mock upload - in prod use Supabase Storage
      return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
      });
  }

  async approveEmployee(uan: string, app: boolean, aid: string) { 
      await this.client.from('employees').update({ status: app ? 'APPROVED' : 'REJECTED' }).eq('uan', uan); 
  }

  async deleteSalaryRecord(id: string, aid: string) { 
      await this.client.from('salary_records').delete().eq('id', id);
  }

  async getNotifications(uid: string) { return []; }
}

export const dbService = new DBService();