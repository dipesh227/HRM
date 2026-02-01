import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserRole, SiteStatus, EmployeeStatus, EmployeeRole, 
  User, Company, Site, Employee, SalaryRecord, SalaryView,
  AuditLog, Notification
} from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================
const getEnvVar = (key: string) => (import.meta as any).env?.[key] || '';
let SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Normalize URL (strip trailing slash)
if (SUPABASE_URL.endsWith('/')) {
    SUPABASE_URL = SUPABASE_URL.slice(0, -1);
}

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: { 'x-application-name': 'konark-hr-v3' }
            }
        });
    } catch (e) {
        console.error("Critical: Failed to initialize Supabase client", e);
    }
}

export type ConnectionStatus = {
    connected: boolean;
    error?: string;
    code?: 'AUTH' | 'NETWORK' | 'NO_SCHEMA' | 'UNKNOWN';
};

class DBService {
  
  // --- CONNECTION CHECK & DIAGNOSTICS ---
  async checkConnection(): Promise<ConnectionStatus> {
      if (!supabase) return { connected: false, error: "Missing Environment Variables (URL/KEY)", code: 'AUTH' };
      
      try {
          // STEP 1: Check Auth Service (Lightweight, checks URL + Key reachability)
          // This verifies if we can reach the server at all, before checking for tables.
          const { error: authError } = await supabase.auth.getSession();
          
          if (authError) {
             console.error("Auth Check Failed:", authError);
             if (authError.message.includes('FetchError') || authError.message.includes('network') || authError.status === 0) {
                 return { connected: false, error: "Network Error: Cannot reach Supabase URL. Check your internet or URL in .env", code: 'NETWORK' };
             }
             if (authError.status === 401 || authError.status === 403) {
                 return { connected: false, error: "Auth Error: Invalid API Key.", code: 'AUTH' };
             }
          }

          // STEP 2: Check Database Schema (Requires tables to exist)
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 15000); // Increased to 15s

          const { data, error, status } = await supabase
            .from('companies')
            .select('id')
            .limit(1)
            .abortSignal(abortController.signal);
            
          clearTimeout(timeoutId);
          
          if (error) {
              console.error("DB Check Error:", error);
              // Diagnostics
              if (error.code === '42P01') {
                  return { connected: false, error: "Database connected but tables are missing.", code: 'NO_SCHEMA' };
              }
              if (error.code === 'PGRST301' || status === 401 || status === 403) {
                  return { connected: false, error: "RLS/Auth Error accessing table.", code: 'AUTH' };
              }
              if (status === 0 || error.message.includes('FetchError') || error.message.includes('network')) {
                  return { connected: false, error: "Server unreachable (Database API).", code: 'NETWORK' };
              }
              return { connected: false, error: `${error.message} (Code: ${error.code})`, code: 'UNKNOWN' };
          }

          return { connected: true };
      } catch (e: any) {
          console.error("DB Check Exception:", e);
          if (e.name === 'AbortError') {
              return { connected: false, error: "Connection timed out (15s). Server is slow or unreachable.", code: 'NETWORK' };
          }
          return { connected: false, error: e.message || "Unknown connection error", code: 'NETWORK' };
      }
  }

  private get client(): SupabaseClient {
      if (!supabase) throw new Error("Database client not initialized");
      return supabase;
  }

  // --- AUTHENTICATION ---
  
  // 1. HR Login (Supabase Auth)
  async loginHR(email: string, password: string): Promise<User> {
    const { data: authData, error: authError } = await this.client.auth.signInWithPassword({ email, password });
    
    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Authentication failed: No user returned.");

    // Fetch Profile from 'users' table
    const { data: profile, error: profileError } = await this.client
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (profileError) {
        // If 406 or other weird error, handle gracefully
        if (profileError.code !== 'PGRST116') {
             console.error("Profile fetch error", profileError);
        }
    }
    
    // Auto-create profile if missing (Self-healing for demo/MVP)
    let userProfile = profile;
    if (!profile) {
        console.warn("User authenticated but no profile found. Attempting to seed...");
        const { data: newProfile, error: createError } = await this.client.from('users').insert({
            id: authData.user.id,
            email: authData.user.email!,
            name: 'HR Admin', // Default
            role: 'HR'
        }).select().single();
        
        if (createError) throw new Error("Profile creation failed: " + createError.message);
        userProfile = newProfile;
    }

    const user: User = {
        id: userProfile.id,
        identityType: 'UUID',
        email: userProfile.email,
        name: userProfile.name,
        role: UserRole.HR,
        companyId: userProfile.company_id
    };

    await this.logAudit(user.id, 'LOGIN_SUCCESS', 'Auth', 'HR Session Started');
    return user;
  }

  // 2. Staff Login (UAN Based - Passwordless)
  async loginStaff(uan: string): Promise<User> {
      const cleanUan = uan.trim();
      if (!/^\d{12}$/.test(cleanUan)) throw new Error("UAN must be exactly 12 digits.");

      const { data: emp, error } = await this.client
          .from('employees')
          .select('*')
          .eq('uan', cleanUan)
          .maybeSingle();

      if (error) throw new Error("Database error during staff login: " + error.message);
      if (!emp) throw new Error("Employee not found. Please check UAN.");
      
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