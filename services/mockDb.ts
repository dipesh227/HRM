import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserRole, SiteStatus, EmployeeStatus, EmployeeRole, 
  User, Company, Site, Employee, SalaryRecord, SalaryView,
  AuditLog, Notification
} from '../types';

// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

const getEnv = (key: string) => {
  // @ts-ignore
  return (import.meta.env && import.meta.env[key]) ? import.meta.env[key] : '';
};

// FALLBACK CREDENTIALS
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
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: window.localStorage
            },
            db: { schema: 'public' },
            global: { headers: { 'x-application-name': 'konark-hr-system' } }
        });
    } catch (e) {
        console.error("Critical: Failed to initialize Supabase client", e);
    }
}

export type ConnectionStatus = {
    connected: boolean;
    error?: string;
    code?: 'AUTH' | 'NETWORK' | 'NO_SCHEMA' | 'UNKNOWN';
    usingMock?: boolean;
};

// --- MOCK DATA STORE (For Development Fallback) ---
const MOCK_DB = {
    companies: [
        { id: 'c1', clientId: 'KONARK001', name: 'Konark Enterprises Pvt. Ltd.', logoUrl: 'https://via.placeholder.com/150', email: 'info@konark.com', mobile: '9988776655', address: 'Pune, India' }
    ] as Company[],
    sites: [
        { id: 's1', companyId: 'c1', name: 'Konark Site - Pune HQ', siteCode: 'KE-PUN-01', address: 'Plot 45, Infotech Park', city: 'Pune', state: 'MH', status: SiteStatus.ACTIVE }
    ] as Site[],
    employees: [
        { uan: '100000000001', name: 'Rajesh Kumar', role: EmployeeRole.SUPERVISOR, companyId: 'c1', siteId: 's1', status: EmployeeStatus.APPROVED, addedBy: 'SYSTEM', joinedDate: '2024-01-01' },
        { uan: '100000000002', name: 'Sunil Patil', role: EmployeeRole.DRIVER, companyId: 'c1', siteId: 's1', status: EmployeeStatus.APPROVED, addedBy: 'SYSTEM', joinedDate: '2024-01-15' },
        { uan: '100000000003', name: 'Amit Singh', role: EmployeeRole.HELPER, companyId: 'c1', siteId: 's1', status: EmployeeStatus.PENDING, addedBy: 'SYSTEM', joinedDate: '2024-02-01' }
    ] as Employee[],
    salary_records: [] as SalaryRecord[],
    audit_logs: [] as AuditLog[],
    notifications: [] as Notification[]
};

class DBService {
  private mockMode = false;
  
  // --- CONNECTION CHECK & MODE SWITCH ---
  async checkConnection(): Promise<ConnectionStatus> {
      if (!supabase) {
          this.mockMode = true;
          return { connected: true, usingMock: true };
      }
      
      try {
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5s Timeout

          const { error: dbError } = await supabase
            .from('companies')
            .select('count', { count: 'exact', head: true })
            .abortSignal(abortController.signal);
            
          clearTimeout(timeoutId);
          
          if (dbError) {
              if (dbError.code === 'PGRST301') return { connected: true };
              throw dbError;
          }

          return { connected: true };
      } catch (e: any) {
          console.warn("DB Connection Failed. Switching to Mock Mode.", e.message);
          this.mockMode = true;
          return { connected: true, usingMock: true, error: "Running in Development Mode (Mock Data)" };
      }
  }

  private get client(): SupabaseClient {
      if (!supabase) throw new Error("Database client not initialized");
      return supabase;
  }

  // --- AUTHENTICATION ---
  
  async loginHR(email: string, password: string): Promise<User> {
    if (this.mockMode) {
        // Mock HR Login
        if (email === 'admin@konark.com' && password === 'Hr@12345') {
            await this.logAudit('mock-hr-id', 'LOGIN_SUCCESS', 'Auth', 'HR Mock Session');
            return {
                id: 'mock-hr-id',
                identityType: 'UUID',
                email: email,
                name: 'System Admin (Mock)',
                role: UserRole.HR,
                companyId: 'c1'
            };
        }
        throw new Error("Invalid Credentials. (Try: admin@konark.com / Hr@12345)");
    }

    try {
        const { data, error } = await this.client.rpc("verify_hr_login", {
          p_email: email,
          p_password: password,
        });

        console.log("LOGIN RESULT", data, error);

        if (error) {
            console.error("Login RPC Error:", error);
            throw new Error(error.message);
        }

        if (!data || data.length === 0) {
            throw new Error("Invalid credentials");
        }

        const userData = data[0];

        const user: User = {
            id: userData.id,
            identityType: 'UUID',
            email: email,
            name: userData.name,
            role: userData.role as UserRole,
            companyId: userData.company_id
        };

        await this.logAudit(user.id, 'LOGIN_SUCCESS', 'Auth', 'HR Session Started');
        return user;
    } catch (err: any) {
        console.warn("Login failed", err);
        throw err;
    }
  }

  async loginStaff(uan: string): Promise<User> {
      const cleanUan = uan.trim();
      if (!/^\d{12}$/.test(cleanUan)) throw new Error("UAN must be exactly 12 digits.");

      if (this.mockMode) {
          const emp = MOCK_DB.employees.find(e => e.uan === cleanUan);
          if (!emp) throw new Error("UAN not found in Mock DB.");
          if (emp.status !== EmployeeStatus.APPROVED) throw new Error(`Account Status: ${emp.status}`);

          let sysRole = UserRole.EMPLOYEE;
          if (['Supervisor', 'Safety Officer'].includes(emp.role)) sysRole = UserRole.SITE_INCHARGE;

          await this.logAudit(emp.uan, 'LOGIN_SUCCESS', 'Auth', `Staff Login (Mock): ${sysRole}`);
          return {
              id: emp.uan,
              identityType: 'UAN',
              name: emp.name,
              role: sysRole,
              companyId: emp.companyId,
              siteId: emp.siteId
          };
      }

      const { data: emp, error } = await this.client
          .from('employees')
          .select('*')
          .eq('uan', cleanUan)
          .maybeSingle();

      if (error || !emp) throw new Error(error ? error.message : "UAN not found.");
      if (emp.status !== EmployeeStatus.APPROVED) throw new Error(`Login Failed: Status is ${emp.status}`);

      let sysRole = UserRole.EMPLOYEE;
      if (['Supervisor', 'Safety Officer'].includes(emp.role)) sysRole = UserRole.SITE_INCHARGE;

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
    if (this.mockMode) {
        return {
            totalCompanies: MOCK_DB.companies.length,
            totalSites: MOCK_DB.sites.length,
            activeSites: MOCK_DB.sites.filter(s => s.status === SiteStatus.ACTIVE).length,
            pendingApprovals: MOCK_DB.employees.filter(e => e.status === EmployeeStatus.PENDING).length,
            totalEmployees: MOCK_DB.employees.length
        };
    }

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

  // --- COMPANY ---
  
  async getCompanyProfile(companyId: string): Promise<Company | undefined> {
    if (this.mockMode) return MOCK_DB.companies.find(c => c.id === companyId);
    const { data } = await this.client.from('companies').select('*').eq('id', companyId).maybeSingle();
    if (!data) return undefined;
    return { 
        id: data.id, clientId: data.client_id, name: data.name, logoUrl: data.logo_url,
        email: data.email, mobile: data.mobile, address: data.address
    };
  }

  async updateCompanyProfile(companyId: string, updates: Partial<Company>): Promise<void> {
      if (this.mockMode) {
          const idx = MOCK_DB.companies.findIndex(c => c.id === companyId);
          if (idx >= 0) MOCK_DB.companies[idx] = { ...MOCK_DB.companies[idx], ...updates };
          return;
      }
      const { error } = await this.client.from('companies').update({
          name: updates.name,
          email: updates.email,
          mobile: updates.mobile,
          address: updates.address,
          logo_url: updates.logoUrl
      }).eq('id', companyId);
      if (error) throw error;
      await this.logAudit('HR_ADMIN', 'COMPANY_UPDATE', companyId, 'Updated Profile');
  }

  // --- SITES ---

  async getAllSites(): Promise<Site[]> {
    if (this.mockMode) return [...MOCK_DB.sites];
    const { data, error } = await this.client.from('sites').select('*').order('name');
    if (error) throw error;
    return (data || []).map(this.mapSite);
  }

  async uploadSiteLogo(file: File): Promise<string> {
      if (this.mockMode) return URL.createObjectURL(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `site-logos/${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error } = await this.client.storage.from('app-assets').upload(fileName, file);
      if (error) throw new Error("Logo Upload Failed: " + error.message);
      const { data } = this.client.storage.from('app-assets').getPublicUrl(fileName);
      return data.publicUrl;
  }

  async createSite(site: Partial<Site>): Promise<void> {
    if (this.mockMode) {
        MOCK_DB.sites.push({ ...site, id: `s${Date.now()}` } as Site);
        return;
    }
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

  // --- EMPLOYEES ---

  async getPendingEmployees(): Promise<Employee[]> {
    if (this.mockMode) return MOCK_DB.employees.filter(e => e.status === EmployeeStatus.PENDING);
    const { data, error } = await this.client.from('employees').select('*').eq('status', 'PENDING');
    if (error) return [];
    return (data || []).map(this.mapEmployee);
  }

  async approveEmployee(uan: string, approved: boolean, adminId: string): Promise<void> {
    const status = approved ? EmployeeStatus.APPROVED : EmployeeStatus.REJECTED;
    if (this.mockMode) {
        const emp = MOCK_DB.employees.find(e => e.uan === uan);
        if (emp) emp.status = status;
        return;
    }
    const { error } = await this.client.from('employees').update({ status }).eq('uan', uan);
    if (error) throw error;
    await this.logAudit(adminId, approved ? 'EMP_APPROVED' : 'EMP_REJECTED', uan, 'Status Update');
  }

  // --- SALARY (Module 5) ---

  async uploadSalaryData(records: SalaryRecord[], actorId: string): Promise<{processed: number, skipped: number}> {
    // Basic Net Salary Calculation Logic handled in DB (Generated Column), 
    // but we can compute here for Mock Mode or validation
    
    // Ensure uniqueness constraint: uan + month + year + site_id
    
    if (this.mockMode) {
        let processed = 0;
        records.forEach(r => {
             // Calculate Net Salary for Mock
             const net = r.basic + r.hra + r.allowances - r.pfDeduction - r.taxDeduction;
             const rWithNet = { ...r, netSalary: net };

             const idx = MOCK_DB.salary_records.findIndex(x => 
                 x.employeeUan === r.employeeUan && 
                 x.month === r.month && 
                 x.year === r.year && 
                 x.siteId === r.siteId
             );
             
             if (idx >= 0) MOCK_DB.salary_records[idx] = { ...rWithNet, id: MOCK_DB.salary_records[idx].id };
             else MOCK_DB.salary_records.push({ ...rWithNet, id: `sal${Date.now()}-${Math.random()}` });
             processed++;
        });
        return { processed, skipped: 0 };
    }

    const dbRecords = records.map(rec => ({
        employee_uan: rec.employeeUan,
        site_id: rec.siteId,
        month: rec.month,
        year: rec.year,
        basic: rec.basic,
        hra: rec.hra,
        allowances: rec.allowances,
        pf_deduction: rec.pfDeduction,
        tax_deduction: rec.taxDeduction,
        is_locked: true
        // net_salary is generated by DB
    }));

    const { error } = await this.client.from('salary_records')
      .upsert(dbRecords, { onConflict: 'employee_uan, month, year, site_id' });
      
    if (error) throw new Error(error.message);
    
    await this.logAudit(actorId, 'SALARY_UPLOAD', 'Batch', `${records.length} records processed for Site: ${records[0]?.siteId}`);
    return { processed: records.length, skipped: 0 };
  }

  async getEmployeeSalaryView(uan: string, month: number, year: number): Promise<SalaryView | undefined> {
      if (this.mockMode) {
          const r = MOCK_DB.salary_records.find(x => x.employeeUan === uan && x.month === month && x.year === year);
          if (!r) return undefined;
          return r;
      }
      
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
      if (this.mockMode) {
          return MOCK_DB.salary_records
            .filter(r => r.employeeUan === uan)
            .map(r => ({ month: r.month, year: r.year }))
            .sort((a,b) => (b.year - a.year) || (b.month - a.month));
      }
      const { data } = await this.client.from('salary_records')
        .select('month, year')
        .eq('employee_uan', uan)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      return data || [];
  }

  // --- SITE INCHARGE ---
  
  async getSiteEmployees(siteId: string): Promise<Employee[]> {
      if (this.mockMode) return MOCK_DB.employees.filter(e => e.siteId === siteId);
      const { data } = await this.client.from('employees').select('*').eq('site_id', siteId);
      return (data || []).map(this.mapEmployee);
  }

  async addEmployee(emp: Employee): Promise<void> {
      if (!/^\d{12}$/.test(emp.uan)) throw new Error("UAN must be 12 digits.");
      if (this.mockMode) {
          if (MOCK_DB.employees.some(e => e.uan === emp.uan)) throw new Error("Employee already exists");
          MOCK_DB.employees.push(emp);
          return;
      }
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
      if (this.mockMode) return MOCK_DB.sites.find(s => s.id === siteId);
      const { data, error } = await this.client.from('sites').select('*').eq('id', siteId).maybeSingle();
      if (error) console.error(error);
      return data ? this.mapSite(data) : undefined;
  }

  // --- COMMON ---

  async getNotifications(userId: string): Promise<Notification[]> {
      if (this.mockMode) return MOCK_DB.notifications.filter(n => n.userId === userId);
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
      if (this.mockMode) return MOCK_DB.companies.find(c => c.id === id);
      const { data } = await this.client.from('companies').select('*').eq('id', id).maybeSingle();
      if (!data) return undefined;
      return { 
          id: data.id, clientId: data.client_id, name: data.name, logoUrl: data.logo_url,
          email: data.email, mobile: data.mobile, address: data.address
      };
  }

  async getAuditLogs(): Promise<AuditLog[]> {
      if (this.mockMode) return MOCK_DB.audit_logs;
      const { data } = await this.client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
      return (data || []).map((l:any) => ({
          id: l.id, timestamp: l.timestamp, actorId: l.actor_id,
          action: l.action, target: l.target, details: l.details, severity: l.severity
      }));
  }

  private async logAudit(actorId: string, action: string, target: string, details: string) {
      if (this.mockMode) {
          MOCK_DB.audit_logs.unshift({ id: `log${Date.now()}`, timestamp: new Date().toISOString(), actorId, action, target, details, severity: 'INFO' });
          return;
      }
      try {
        await this.client.from('audit_logs').insert({ actor_id: actorId, action, target, details });
      } catch(e) { console.warn("Audit Log Failed", e); }
  }

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