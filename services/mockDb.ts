import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserRole, SiteStatus, EmployeeStatus, EmployeeRole, 
  User, Company, Site, Employee, SalaryRecord,
  AuditLog, Notification, SystemConfig
} from '../types';

// ============================================================================
// CONFIGURATION
// Reads from Environment Variables (Vite standard)
// ============================================================================
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase
let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error("Supabase Client Init Failed", e);
    }
}

export type ConnectionStatus = {
    connected: boolean;
    error?: string;
    code?: 'AUTH' | 'NETWORK' | 'NO_SCHEMA' | 'UNKNOWN';
};

class DBService {
  
  // --- CONNECTION CHECK (Level 1 & Level 2) ---

  async checkConnection(): Promise<ConnectionStatus> {
      if (!supabase) return { connected: false, error: "Missing Environment Variables", code: 'AUTH' };
      
      try {
          // Level 1 & 2 Combined Check
          // We try to select from 'companies'.
          // If network/auth fails -> Level 1 Error
          // If table doesn't exist -> Level 2 Error (Schema Missing)
          
          const { error } = await supabase.from('companies').select('id', { count: 'exact', head: true });
          
          if (error) {
              // Level 2: Connected but Schema Missing (Postgres Code 42P01 = undefined_table)
              if (error.code === '42P01') {
                  return { connected: false, error: "Schema missing: 'companies' table not found.", code: 'NO_SCHEMA' };
              }
              // Level 1: Auth Failed
              if (error.code === 'PGRST301' || error.message.includes('JWT') || error.code === '401') {
                  return { connected: false, error: "Invalid API Key or JWT expired.", code: 'AUTH' };
              }
              // Level 1: Network/Host Error
              return { connected: false, error: error.message, code: 'NETWORK' };
          }

          return { connected: true };
      } catch (e: any) {
          return { connected: false, error: e.message || "Network connection failed", code: 'NETWORK' };
      }
  }

  // --- HELPER ---
  private get client(): SupabaseClient {
      if (!supabase) throw new Error("Supabase not initialized");
      return supabase;
  }

  // --- AUTH ---
  
  async login(identifier: string, password?: string): Promise<User> {
    const cleanId = identifier.trim();
    if (!cleanId) throw new Error("Please enter a valid User ID or Email.");
    
    // We query the 'users' table directly
    let query = this.client.from('users').select('*');
    
    // Determine if email or UAN based on input format
    const isEmail = cleanId.includes('@');
    if (isEmail) {
        query = query.eq('email', cleanId);
    } else {
        query = query.eq('uan', cleanId);
    }

    // Use maybeSingle() to handle 0 or 1 result gracefully
    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error("Login Query Error:", error);
        throw new Error("System Error: " + error.message);
    }

    if (!data) {
        throw new Error("Account not found. Please check your ID.");
    }

    const user = this.mapUser(data);

    // Password Check
    // Note: Logic preserved for demo - Employees might not have password enforced in UI preset
    if (user.role !== UserRole.EMPLOYEE) {
        if (!password) throw new Error("Password is required.");
        
        if (user.password !== password) {
             await this.logAudit('Unknown', 'LOGIN_FAILED', cleanId, 'Invalid credentials', 'WARN');
             throw new Error("Incorrect password.");
        }
    }

    await this.logAudit(user.name, 'LOGIN_SUCCESS', 'Auth', 'User session started');
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

  // --- SITES CRUD ---

  async getAllSites(): Promise<Site[]> {
    const { data, error } = await this.client.from('sites').select('*');
    if (error) throw error;
    return data.map(this.mapSite);
  }

  async createSite(site: Partial<Site>): Promise<void> {
    const dbSite = {
        name: site.name,
        company_id: site.companyId,
        site_code: site.siteCode,
        address: site.address,
        city: site.city,
        state: site.state,
        pincode: site.pincode,
        email: site.email,
        mobile: site.mobile,
        manager_name: site.managerName,
        manager_mobile: site.managerMobile,
        status: SiteStatus.ACTIVE,
        logo_url: site.logoUrl
    };

    const { error } = await this.client.from('sites').insert(dbSite);
    if (error) throw error;
    await this.logAudit('Super HR', 'CREATE_SITE', site.name || 'New Site', 'New site added');
  }

  async updateSite(id: string, updates: Partial<Site>): Promise<void> {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.siteCode) dbUpdates.site_code = updates.siteCode;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.city) dbUpdates.city = updates.city;
    if (updates.state) dbUpdates.state = updates.state;
    if (updates.pincode) dbUpdates.pincode = updates.pincode;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.mobile) dbUpdates.mobile = updates.mobile;
    if (updates.managerName) dbUpdates.manager_name = updates.managerName;
    if (updates.managerMobile) dbUpdates.manager_mobile = updates.managerMobile;
    if (updates.logoUrl) dbUpdates.logo_url = updates.logoUrl;

    const { error } = await this.client.from('sites').update(dbUpdates).eq('id', id);
    if (error) throw error;
    await this.logAudit('Super HR', 'UPDATE_SITE', updates.name || id, 'Site details updated');
  }

  async deleteSite(id: string): Promise<void> {
     const { count: empCount } = await this.client.from('employees').select('*', { count: 'exact', head: true }).eq('site_id', id);
     if (empCount && empCount > 0) throw new Error(`Cannot delete site. It has ${empCount} active employees.`);

     const { error } = await this.client.from('sites').delete().eq('id', id);
     if (error) throw error;
     await this.logAudit('Super HR', 'DELETE_SITE', id, 'Site deleted', 'WARN');
  }

  async toggleSiteStatus(siteId: string): Promise<Site | null> {
    const { data: site } = await this.client.from('sites').select('status').eq('id', siteId).single();
    if (!site) return null;

    const newStatus = site.status === 'ACTIVE' ? SiteStatus.CLOSED : SiteStatus.ACTIVE;
    
    const { data, error } = await this.client.from('sites').update({ status: newStatus }).eq('id', siteId).select().single();
    if (error) throw error;

    await this.logAudit('Super HR', 'SITE_STATUS_CHANGE', siteId, `Status changed to ${newStatus}`, 'WARN');
    return this.mapSite(data);
  }

  // --- USERS / INCHARGES CRUD ---

  async getAllIncharges(): Promise<User[]> {
      const { data, error } = await this.client.from('users').select('*').eq('role', 'SITE_INCHARGE');
      if (error) return [];
      return data.map(this.mapUser);
  }

  async createSystemUser(user: Partial<User>): Promise<void> {
      if(!user.uan || !user.password || !user.role) throw new Error("Missing credentials");

      const newUser = {
          uan: user.uan,
          email: user.email,
          password: user.password,
          name: user.name || 'User',
          role: user.role,
          company_id: user.companyId,
          site_id: user.siteId
      };
      
      const { error } = await this.client.from('users').insert(newUser);
      if (error) throw error;

      await this.logAudit('Super HR', 'CREATE_USER', user.name || 'User', `Role: ${user.role}`);
  }

  async deleteUser(id: string): Promise<void> {
      const { error } = await this.client.from('users').delete().eq('id', id);
      if (error) throw error;
      await this.logAudit('Super HR', 'DELETE_USER', id, 'User deleted', 'WARN');
  }

  // --- EMPLOYEE CRUD ---

  async getPendingEmployees(): Promise<Employee[]> {
    const { data, error } = await this.client.from('employees').select('*').eq('status', 'PENDING');
    if (error) return [];
    return data.map(this.mapEmployee);
  }

  async approveEmployee(employeeId: string, approved: boolean): Promise<void> {
    const status = approved ? EmployeeStatus.APPROVED : EmployeeStatus.REJECTED;
    
    const { data: emp, error: fetchErr } = await this.client.from('employees').select('*').eq('id', employeeId).single();
    if (fetchErr || !emp) throw new Error("Employee not found");

    const { error } = await this.client.from('employees').update({ status }).eq('id', employeeId);
    if (error) throw error;

    await this.logAudit('Super HR', approved ? 'EMP_APPROVED' : 'EMP_REJECTED', emp.name, `UAN: ${emp.uan}`, 'INFO');
    
    // Auto-create User account for employee if approved
    if (approved) {
       const { data: existing } = await this.client.from('users').select('*').eq('uan', emp.uan).single();
       if (!existing) {
           await this.client.from('users').insert({
               uan: emp.uan,
               name: emp.name,
               role: UserRole.EMPLOYEE,
               password: '123', // Default Password
               company_id: emp.company_id,
               site_id: emp.site_id,
               email: `${emp.uan.toLowerCase()}@konark.temp` 
           });
       }
    }
  }

  async searchEmployees(query: string): Promise<Employee[]> {
      if (!query) return [];
      const { data, error } = await this.client
        .from('employees')
        .select('*')
        .or(`name.ilike.%${query}%,uan.ilike.%${query}%`)
        .limit(10);
        
      if (error) return [];
      return data.map(this.mapEmployee);
  }

  async getAllEmployeesMap(): Promise<Map<string, string>> {
     const { data } = await this.client.from('employees').select('id, uan');
     const map = new Map<string, string>();
     data?.forEach((e: any) => map.set(e.uan, e.id));
     return map;
  }

  async uploadSalaryData(records: SalaryRecord[]): Promise<number> {
    const dbRecords = records.map(rec => ({
        employee_id: rec.employeeId,
        month: rec.month,
        year: rec.year,
        basic: rec.basic,
        hra: rec.hra,
        allowances: rec.allowances,
        pf_deduction: rec.pfDeduction,
        tax_deduction: rec.taxDeduction,
        net_salary: rec.netSalary,
        is_locked: true
    }));

    const { data, error } = await this.client.from('salary_records').upsert(dbRecords, { onConflict: 'employee_id, month, year' }).select();
    
    if (error) {
        console.error(error);
        throw new Error("Failed to upload salary data");
    }
    
    await this.logAudit('Super HR', 'SALARY_UPLOAD', 'System', `${records.length} records processed`, 'INFO');
    return records.length; 
  }

  // --- SITE INCHARGE METHODS ---

  async getSiteEmployees(siteId: string): Promise<Employee[]> {
    const { data, error } = await this.client.from('employees').select('*').eq('site_id', siteId);
    if (error) return [];
    return data.map(this.mapEmployee);
  }

  async getSiteDetails(siteId: string): Promise<Site | undefined> {
    const { data, error } = await this.client.from('sites').select('*').eq('id', siteId).single();
    if (error || !data) return undefined;
    return this.mapSite(data);
  }

  async addEmployee(emp: Employee): Promise<void> {
    const dbEmp = {
        name: emp.name,
        uan: emp.uan,
        role: emp.role,
        company_id: emp.companyId,
        site_id: emp.siteId,
        status: EmployeeStatus.PENDING,
        added_by: emp.addedBy,
        joined_date: emp.joinedDate
    };

    const { error } = await this.client.from('employees').insert(dbEmp);
    if (error) throw error;
    await this.logAudit('Site Incharge', 'EMP_CREATE', emp.name, 'Pending HR Approval');
  }

  // --- EMPLOYEE METHODS ---

  async getEmployeeSalaryHistory(uan: string): Promise<{month: number, year: number}[]> {
    const { data: emp } = await this.client.from('employees').select('id').eq('uan', uan).single();
    if (!emp) return [];

    const { data, error } = await this.client
        .from('salary_records')
        .select('month, year')
        .eq('employee_id', emp.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

    if (error) return [];
    return data;
  }

  async getEmployeeSalary(uan: string, month: number, year: number): Promise<SalaryRecord | undefined> {
    const { data: emp } = await this.client.from('employees').select('id').eq('uan', uan).single();
    if (!emp) return undefined;

    const { data, error } = await this.client
        .from('salary_records')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('month', month)
        .eq('year', year)
        .single();
    
    if (error || !data) return undefined;
    return this.mapSalary(data);
  }

  async getEmployeeDetails(uan: string): Promise<Employee | undefined> {
    const { data, error } = await this.client.from('employees').select('*').eq('uan', uan).single();
    if (error || !data) return undefined;
    return this.mapEmployee(data);
  }

  async getCompanyDetails(companyId: string): Promise<Company | undefined> {
    const { data, error } = await this.client.from('companies').select('*').eq('id', companyId).single();
    if (error || !data) return undefined;
    return {
        id: data.id,
        clientId: data.client_id,
        name: data.name,
        logoUrl: data.logo_url
    };
  }

  // --- UTILS ---

  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await this.client
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${userId},user_id.eq.ALL`)
        .order('timestamp', { ascending: false })
        .limit(10);
    
    if (error) return [];
    return data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        timestamp: n.timestamp
    }));
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await this.client
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
    
    if (error) return [];
    return data.map((l: any) => ({
        id: l.id,
        timestamp: l.timestamp,
        actorName: l.actor_name,
        action: l.action,
        target: l.target,
        details: l.details,
        severity: l.severity
    }));
  }

  async getConfig(): Promise<SystemConfig> {
    return {
       allowSiteClosures: true,
       requireTwoFactor: false,
       autoLockSalary: true,
       emailAlerts: true
    };
  }

  async getAnalytics() {
     const { data: records } = await this.client.from('salary_records').select('net_salary, employee_id');
     const { data: employees } = await this.client.from('employees').select('id, site_id');
     const { data: sites } = await this.client.from('sites').select('id, name');

     if (!records || !employees || !sites) return { siteCosts: [], totalPayroll: 0 };

     const siteCosts: Record<string, number> = {};
     let total = 0;

     records.forEach((rec: any) => {
         const emp = employees.find((e: any) => e.id === rec.employee_id);
         if (emp) {
             const site = sites.find((s: any) => s.id === emp.site_id);
             const siteName = site ? site.name : 'Unknown';
             siteCosts[siteName] = (siteCosts[siteName] || 0) + Number(rec.net_salary);
             total += Number(rec.net_salary);
         }
     });

     return {
         siteCosts: Object.keys(siteCosts).map(name => ({ name, value: siteCosts[name] })),
         totalPayroll: total
     };
  }

  // --- INTERNAL UTILS ---

  private async logAudit(actorName: string, action: string, target: string, details: string, severity: 'INFO' | 'WARN' | 'CRITICAL' = 'INFO') {
     await this.client.from('audit_logs').insert({
         actor_name: actorName,
         action,
         target,
         details,
         severity
     });
  }

  private mapUser(u: any): User {
      return {
          id: u.id,
          uan: u.uan,
          email: u.email,
          password: u.password,
          name: u.name,
          role: u.role as UserRole,
          companyId: u.company_id,
          siteId: u.site_id
      };
  }

  private mapSite(s: any): Site {
      return {
          id: s.id,
          companyId: s.company_id,
          name: s.name,
          siteCode: s.site_code,
          address: s.address,
          city: s.city,
          state: s.state,
          pincode: s.pincode,
          email: s.email,
          mobile: s.mobile,
          managerName: s.manager_name,
          managerMobile: s.manager_mobile,
          status: s.status as SiteStatus,
          logoUrl: s.logo_url
      };
  }

  private mapEmployee(e: any): Employee {
      return {
          id: e.id,
          uan: e.uan,
          name: e.name,
          role: e.role as EmployeeRole,
          companyId: e.company_id,
          siteId: e.site_id,
          status: e.status as EmployeeStatus,
          addedBy: e.added_by,
          joinedDate: e.joined_date
      };
  }

  private mapSalary(s: any): SalaryRecord {
      return {
          id: s.id,
          employeeId: s.employee_id,
          month: s.month,
          year: s.year,
          basic: s.basic,
          hra: s.hra,
          allowances: s.allowances,
          pfDeduction: s.pf_deduction,
          taxDeduction: s.tax_deduction,
          netSalary: s.net_salary,
          isLocked: s.is_locked
      };
  }
}

export const dbService = new DBService();