import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserRole, SiteStatus, EmployeeStatus, EmployeeRole, 
  User, Company, Site, Employee, SalaryRecord, SalaryView,
  AuditLog, Notification
} from '../types';

// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

// Helper: robust env extraction with fallback for missing types
const getEnv = (key: string) => {
  // @ts-ignore
  return (import.meta.env && import.meta.env[key]) ? import.meta.env[key] : '';
};

// 1. Get URL (Handle potential trailing slash)
let SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
if (SUPABASE_URL && SUPABASE_URL.endsWith('/')) {
    SUPABASE_URL = SUPABASE_URL.slice(0, -1);
}

// 2. Get Key (Updated to use VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY');

let supabase: SupabaseClient | null = null;

// Initialize Client if credentials exist
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true, // Persist auth state in localStorage
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: window.localStorage // Explicitly use localStorage
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: { 'x-application-name': 'konark-hr-system' }
            }
        });
    } catch (e) {
        console.error("Critical: Failed to initialize Supabase client", e);
    }
} else {
    console.warn("Supabase credentials missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY.");
}

export type ConnectionStatus = {
    connected: boolean;
    error?: string;
    code?: 'AUTH' | 'NETWORK' | 'NO_SCHEMA' | 'UNKNOWN';
};

class DBService {
  
  // --- CONNECTION CHECK & DIAGNOSTICS ---
  async checkConnection(): Promise<ConnectionStatus> {
      if (!supabase) return { connected: false, error: "Missing Credentials. Check .env file for VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY.", code: 'AUTH' };
      
      try {
          // STEP 1: Basic Reachability (Auth Endpoint)
          // This verifies internet connection and valid URL/Key
          const { error: authError } = await supabase.auth.getSession();
          
          if (authError) {
             console.error("Auth Connection Check Failed:", authError);
             
             // Network/Fetch Errors
             if (authError.message.includes('FetchError') || authError.message.includes('Failed to fetch') || authError.status === 0) {
                 return { connected: false, error: "Network Error: Cannot reach Supabase. Check Internet/URL.", code: 'NETWORK' };
             }
             // Invalid Key Errors (401/403)
             if (authError.status === 401 || authError.status === 403) {
                 return { connected: false, error: "Authentication Failed. Check API Key.", code: 'AUTH' };
             }
          }

          // STEP 2: Database Reachability (Schema Check)
          // Try to select 1 row from 'companies'. 
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10s Timeout

          const { error: dbError, status } = await supabase
            .from('companies')
            .select('count', { count: 'exact', head: true }) // Lightweight HEAD request
            .abortSignal(abortController.signal);
            
          clearTimeout(timeoutId);
          
          if (dbError) {
              console.error("DB Connection Check Failed:", dbError);
              
              // Table missing code
              if (dbError.code === '42P01') {
                  return { connected: false, error: "Database connected but tables are missing.", code: 'NO_SCHEMA' };
              }
              // RLS Error (Actually means we are connected!)
              if (dbError.code === 'PGRST301' || status === 401 || status === 403) {
                  // If we get an RLS error, it means we HIT the database and it responded. 
                  // This counts as a successful "connection" for the purpose of the setup screen.
                  return { connected: true };
              }
              // Timeout
              if (dbError.message.includes('AbortError')) {
                   return { connected: false, error: "Connection Timed Out.", code: 'NETWORK' };
              }

              return { connected: false, error: `DB Error: ${dbError.message}`, code: 'UNKNOWN' };
          }

          return { connected: true };
      } catch (e: any) {
          console.error("Connection Exception:", e);
          if (e.name === 'AbortError') return { connected: false, error: "Connection Timed Out.", code: 'NETWORK' };
          return { connected: false, error: e.message || "Unknown error", code: 'NETWORK' };
      }
  }

  private get client(): SupabaseClient {
      if (!supabase) throw new Error("Database client not initialized");
      return supabase;
  }

  // --- AUTHENTICATION ---
  
  // 1. HR Login (Supabase Auth + public.users check)
  async loginHR(email: string, password: string): Promise<User> {
    const { data: authData, error: authError } = await this.client.auth.signInWithPassword({ email, password });
    
    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Authentication failed: No user returned.");

    // STRICT: Fetch Profile from 'users' table. 
    // If not found, deny access. (No auto-creation/self-healing)
    const { data: profile, error: profileError } = await this.client
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Profile fetch error", profileError);
        throw new Error("System Error: Unable to verify HR profile.");
    }
    
    if (!profile) {
        // Force sign out if they are authenticated but not in the users table
        await this.client.auth.signOut();
        throw new Error("Access Denied: Your account is not authorized as HR Admin.");
    }

    const user: User = {
        id: profile.id,
        identityType: 'UUID',
        email: profile.email,
        name: profile.name,
        role: UserRole.HR,
        companyId: profile.company_id
    };

    await this.logAudit(user.id, 'LOGIN_SUCCESS', 'Auth', 'HR Session Started');
    return user;
  }

  // 2. Staff Login (UAN Based - Passwordless)
  // Covers both SITE_INCHARGE and EMPLOYEE roles
  async loginStaff(uan: string): Promise<User> {
      const cleanUan = uan.trim();
      if (!/^\d{12}$/.test(cleanUan)) throw new Error("UAN must be exactly 12 digits.");

      const { data: emp, error } = await this.client
          .from('employees')
          .select('*')
          .eq('uan', cleanUan)
          .maybeSingle();

      if (error) throw new Error("Database error during staff login: " + error.message);
      if (!emp) throw new Error("UAN not found. Please check your ID.");
      
      // Strict Status Check
      if (emp.status !== EmployeeStatus.APPROVED) {
          throw new Error(`Login Failed: Account status is ${emp.status}. Please contact HR.`);
      }

      // Determine Role based on Job Title
      let sysRole = UserRole.EMPLOYEE;
      if (['Supervisor', 'Safety Officer'].includes(emp.role)) {
          sysRole = UserRole.SITE_INCHARGE;
      }

      const user: User = {
          id: emp.uan,
          identityType: 'UAN',
          name: emp.name,
          role: sysRole,
          companyId: emp.company_id,
          siteId: emp.site_id
      };

      await this.logAudit(user.id, 'LOGIN_SUCCESS', 'Auth', `Staff Login: ${sysRole}`);
      return user;
  }

  // --- HR MODULE ---

  async getHRStats() {
    const [companies, sites, employees, pending] = await Promise.all([
        this.client.from('companies').select('*', { count: 'exact', head: true }),
        this.client.from('sites').select('*', { count: 'exact' }),
        this.client.from('employees').select('*', { count: 'exact', head: true }),
        this.client.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')
    ]);
    const activeSites = await this.client.from('sites').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');

    return {
      totalCompanies: companies.count || 0,
      totalSites: sites.count || 0,
      activeSites: activeSites.count || 0,
      pendingApprovals: pending.count || 0,
      totalEmployees: employees.count || 0
    };
  }

  // --- SITES ---

  async getAllSites(): Promise<Site[]> {
    const { data, error } = await this.client.from('sites').select('*').order('name');
    if (error) throw error;
    return (data || []).map(this.mapSite);
  }

  async uploadSiteLogo(file: File): Promise<string> {
      const fileExt = file.name.split('.').pop();
      const fileName = `site-logos/${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error } = await this.client.storage
          .from('app-assets')
          .upload(fileName, file);

      if (error) throw new Error("Logo Upload Failed: " + error.message);

      const { data } = this.client.storage
          .from('app-assets')
          .getPublicUrl(fileName);
          
      return data.publicUrl;
  }

  async createSite(site: Partial<Site>): Promise<void> {
    const { error } = await this.client.from('sites').insert({
        company_id: site.companyId,
        name: site.name,
        site_code: site.siteCode,
        address: site.address,
        city: site.city,
        state: site.state,
        pincode: site.pincode,
        email: site.email,
        mobile: site.mobile,
        manager_name: site.managerName,
        manager_mobile: site.managerMobile,
        logo_url: site.logoUrl,
        status: SiteStatus.ACTIVE
    });
    if (error) throw error;
  }

  async deleteSite(id: string): Promise<void> {
      const { error } = await this.client.from('sites').delete().eq('id', id);
      if (error) throw error;
  }

  // --- EMPLOYEES ---

  async getPendingEmployees(): Promise<Employee[]> {
    const { data, error } = await this.client.from('employees').select('*').eq('status', 'PENDING');
    if (error) return [];
    return (data || []).map(this.mapEmployee);
  }

  async approveEmployee(uan: string, approved: boolean, adminId: string): Promise<void> {
    const status = approved ? EmployeeStatus.APPROVED : EmployeeStatus.REJECTED;
    const { error } = await this.client.from('employees').update({ status }).eq('uan', uan);
    if (error) throw error;
    await this.logAudit(adminId, approved ? 'EMP_APPROVED' : 'EMP_REJECTED', uan, 'Status Update');
  }

  // --- SALARY ---

  async uploadSalaryData(records: SalaryRecord[], actorId: string): Promise<number> {
    const dbRecords = records.map(rec => ({
        employee_uan: rec.employeeUan,
        month: rec.month,
        year: rec.year,
        basic: rec.basic,
        hra: rec.hra,
        allowances: rec.allowances,
        pf_deduction: rec.pfDeduction,
        tax_deduction: rec.taxDeduction,
        is_locked: true
    }));

    const { error } = await this.client.from('salary_records').upsert(dbRecords, { onConflict: 'employee_uan, month, year' });
    if (error) throw new Error(error.message);
    
    await this.logAudit(actorId, 'SALARY_UPLOAD', 'Batch', `${records.length} records processed`);
    return records.length;
  }

  async getEmployeeSalaryView(uan: string, month: number, year: number): Promise<SalaryView | undefined> {
      const { data, error } = await this.client
        .from('salary_view')
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
          month: data.month,
          year: data.year,
          basic: data.basic,
          hra: data.hra,
          allowances: data.allowances,
          pfDeduction: data.pf_deduction,
          taxDeduction: data.tax_deduction,
          netSalary: data.net_salary,
          isLocked: data.is_locked
      };
  }

  async getEmployeeSalaryHistory(uan: string): Promise<{month: number, year: number}[]> {
      const { data } = await this.client.from('salary_records')
        .select('month, year')
        .eq('employee_uan', uan)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      return data || [];
  }

  // --- SITE INCHARGE ---
  
  async getSiteEmployees(siteId: string): Promise<Employee[]> {
      const { data } = await this.client.from('employees').select('*').eq('site_id', siteId);
      return (data || []).map(this.mapEmployee);
  }

  async addEmployee(emp: Employee): Promise<void> {
      if (!/^\d{12}$/.test(emp.uan)) throw new Error("UAN must be 12 digits.");
      
      const dbEmp = {
          uan: emp.uan,
          name: emp.name,
          role: emp.role,
          company_id: emp.companyId,
          site_id: emp.siteId,
          status: EmployeeStatus.PENDING,
          added_by: emp.addedBy,
          joined_date: emp.joinedDate
      };

      const { error } = await this.client.from('employees').insert(dbEmp);
      if (error) throw error;
      
      await this.logAudit(emp.addedBy, 'EMP_CREATE', emp.uan, 'Onboarding');
  }

  async getSiteDetails(siteId: string): Promise<Site | undefined> {
      const { data, error } = await this.client.from('sites').select('*').eq('id', siteId).maybeSingle();
      if (error) console.error(error);
      return data ? this.mapSite(data) : undefined;
  }

  // --- COMMON ---

  async getNotifications(userId: string): Promise<Notification[]> {
      const { data } = await this.client.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(20);
        
      return (data || []).map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          message: n.message,
          type: n.type,
          isRead: n.is_read,
          timestamp: n.timestamp
      }));
  }

  async getCompanyDetails(id: string): Promise<Company | undefined> {
      const { data } = await this.client.from('companies').select('*').eq('id', id).maybeSingle();
      if (!data) return undefined;
      return { id: data.id, clientId: data.client_id, name: data.name, logoUrl: data.logo_url };
  }

  async getAuditLogs(): Promise<AuditLog[]> {
      const { data } = await this.client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
      return (data || []).map((l:any) => ({
          id: l.id, timestamp: l.timestamp, actorId: l.actor_id,
          action: l.action, target: l.target, details: l.details, severity: l.severity
      }));
  }

  private async logAudit(actorId: string, action: string, target: string, details: string) {
      try {
        await this.client.from('audit_logs').insert({ actor_id: actorId, action, target, details });
      } catch(e) { console.warn("Audit Log Failed", e); }
  }

  // MAPPERS
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
          uan: e.uan, name: e.name, role: e.role,
          companyId: e.company_id, siteId: e.site_id,
          status: e.status, addedBy: e.added_by, joinedDate: e.joined_date
      };
  }
}

export const dbService = new DBService();