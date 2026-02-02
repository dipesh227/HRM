import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserRole, SiteStatus, EmployeeStatus, EmployeeRole, 
  User, Company, Site, Employee, SalaryRecord, SalaryView,
  AuditLog, Notification, JobRole
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
    job_roles: [
        { id: 'r1', title: 'Supervisor', description: 'Site Manager', isSystemDefault: true },
        { id: 'r2', title: 'Driver', description: 'Vehicle Operator', isSystemDefault: true },
        { id: 'r3', title: 'Helper', description: 'General Assistant', isSystemDefault: true },
        { id: 'r4', title: 'Safety Officer', description: 'Site Safety', isSystemDefault: true },
        { id: 'r5', title: 'Other', description: 'General', isSystemDefault: true }
    ] as JobRole[],
    employees: [
        { uan: '100000000001', name: 'Rajesh Kumar', role: 'Supervisor', companyId: 'c1', siteId: 's1', status: EmployeeStatus.APPROVED, addedBy: 'SYSTEM', joinedDate: '2024-01-01', mobile: '9876543210' },
        { uan: '100000000002', name: 'Sunil Patil', role: 'Driver', companyId: 'c1', siteId: 's1', status: EmployeeStatus.APPROVED, addedBy: 'SYSTEM', joinedDate: '2024-01-15', mobile: '9876543211' },
        { uan: '100000000003', name: 'Amit Singh', role: 'Helper', companyId: 'c1', siteId: 's1', status: EmployeeStatus.PENDING, addedBy: 'SYSTEM', joinedDate: '2024-02-01' }
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
          if (['Supervisor', 'Safety Officer', 'Site Manager'].includes(emp.role)) sysRole = UserRole.SITE_INCHARGE;

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
      if (['Supervisor', 'Safety Officer', 'Site Manager'].includes(emp.role)) sysRole = UserRole.SITE_INCHARGE;

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

  async updateHRProfile(userId: string, updates: { name: string; email: string; password?: string }): Promise<void> {
    if (this.mockMode) return;
    
    const updatePayload: any = {
        name: updates.name,
        email: updates.email
    };
    // Only update password if provided and not empty
    if (updates.password && updates.password.trim() !== '') {
        updatePayload.password = updates.password;
    }

    const { error } = await this.client
        .from('users')
        .update(updatePayload)
        .eq('id', userId);

    if (error) throw new Error(error.message);
    
    await this.logAudit(userId, 'PROFILE_UPDATE', 'Self', 'Updated profile details');
  }

  // --- JOB ROLES (NEW) ---

  async getJobRoles(): Promise<JobRole[]> {
      if (this.mockMode) return [...MOCK_DB.job_roles];
      
      const { data, error } = await this.client.from('job_roles').select('*').order('title');
      if (error) {
          // Fallback if table doesn't exist yet
          return [
              { id: '1', title: 'Supervisor', isSystemDefault: true },
              { id: '2', title: 'Driver', isSystemDefault: true },
              { id: '3', title: 'Helper', isSystemDefault: true },
              { id: '4', title: 'Safety Officer', isSystemDefault: true },
              { id: '5', title: 'Other', isSystemDefault: true },
          ];
      }

      return (data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          isSystemDefault: r.is_system_default
      }));
  }

  async addJobRole(title: string, description: string): Promise<void> {
      if (this.mockMode) {
          if (MOCK_DB.job_roles.some(r => r.title.toLowerCase() === title.toLowerCase())) {
              throw new Error("Role already exists");
          }
          MOCK_DB.job_roles.push({
              id: `role-${Date.now()}`,
              title,
              description,
              isSystemDefault: false
          });
          return;
      }
      
      const { error } = await this.client.from('job_roles').insert({ title, description });
      if (error) throw error;
  }

  async deleteJobRole(id: string): Promise<void> {
      if (this.mockMode) {
          MOCK_DB.job_roles = MOCK_DB.job_roles.filter(r => r.id !== id);
          return;
      }
      const { error } = await this.client.from('job_roles').delete().eq('id', id);
      if (error) throw error;
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
        id: data.id, 
        clientId: data.client_id, 
        name: data.name, 
        logoUrl: data.logo_url,
        signatureUrl: data.signature_url, // Added
        stampUrl: data.stamp_url,         // Added
        email: data.email, 
        mobile: data.mobile, 
        address: data.address
    };
  }

  async updateCompanyProfile(companyId: string, updates: Partial<Company>): Promise<void> {
      if (this.mockMode) {
          const idx = MOCK_DB.companies.findIndex(c => c.id === companyId);
          if (idx >= 0) MOCK_DB.companies[idx] = { ...MOCK_DB.companies[idx], ...updates };
          return;
      }
      
      const updatePayload: any = {
          name: updates.name,
          email: updates.email,
          mobile: updates.mobile,
          address: updates.address,
          logo_url: updates.logoUrl
      };
      
      if (updates.signatureUrl !== undefined) updatePayload.signature_url = updates.signatureUrl;
      if (updates.stampUrl !== undefined) updatePayload.stamp_url = updates.stampUrl;

      const { error } = await this.client.from('companies').update(updatePayload).eq('id', companyId);
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
      // Generic File Upload: Can be used for Logo, Signature, or Stamp
      // Base64 Encoding with Client-Side Compression
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  // Resize to reasonable logo dimensions (max 400px)
                  const MAX_SIZE = 400;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                      if (width > MAX_SIZE) {
                          height *= MAX_SIZE / width;
                          width = MAX_SIZE;
                      }
                  } else {
                      if (height > MAX_SIZE) {
                          width *= MAX_SIZE / height;
                          height = MAX_SIZE;
                      }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  
                  const ctx = canvas.getContext('2d');
                  if (!ctx) {
                      // Fallback if canvas context fails
                      resolve(event.target?.result as string);
                      return;
                  }
                  
                  ctx.drawImage(img, 0, 0, width, height);
                  
                  // Compress to JPEG at 0.7 quality to save space
                  const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                  resolve(compressedBase64);
              };
              img.onerror = (e) => reject(new Error("Image processing failed"));
          };
          reader.onerror = (e) => reject(new Error("File reading failed"));
      });
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

  async updateSite(siteId: string, updates: Partial<Site>): Promise<void> {
      if (this.mockMode) {
          const idx = MOCK_DB.sites.findIndex(s => s.id === siteId);
          if (idx >= 0) MOCK_DB.sites[idx] = { ...MOCK_DB.sites[idx], ...updates };
          return;
      }
      
      // Map frontend camelCase to DB snake_case for updates
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.siteCode !== undefined) dbUpdates.site_code = updates.siteCode;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.state !== undefined) dbUpdates.state = updates.state;
      if (updates.pincode !== undefined) dbUpdates.pincode = updates.pincode;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.mobile !== undefined) dbUpdates.mobile = updates.mobile;
      if (updates.managerName !== undefined) dbUpdates.manager_name = updates.managerName;
      if (updates.managerMobile !== undefined) dbUpdates.manager_mobile = updates.managerMobile;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;

      const { error } = await this.client
        .from('sites')
        .update(dbUpdates)
        .eq('id', siteId);

      if (error) throw error;
      await this.logAudit('HR_ADMIN', 'SITE_UPDATE', siteId, 'Updated Site Details');
  }

  async deleteSite(siteId: string): Promise<void> {
      // Soft delete by setting status to CLOSED
      if (this.mockMode) {
          const idx = MOCK_DB.sites.findIndex(s => s.id === siteId);
          if (idx >= 0) MOCK_DB.sites[idx].status = SiteStatus.CLOSED;
          return;
      }
      const { error } = await this.client
        .from('sites')
        .update({ status: 'CLOSED' })
        .eq('id', siteId);

      if (error) throw error;
      await this.logAudit('HR_ADMIN', 'SITE_CLOSE', siteId, 'Site Closed/Deleted');
  }

  // --- EMPLOYEES ---
  
  // NEW: Fetch ALL employees for HR Directory
  async getAllEmployees(): Promise<Employee[]> {
    if (this.mockMode) return [...MOCK_DB.employees];
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

  // NEW: Update Employee Profile (Personal Details)
  async updateEmployeeProfile(uan: string, updates: Partial<Employee>): Promise<void> {
      if (this.mockMode) {
          const idx = MOCK_DB.employees.findIndex(e => e.uan === uan);
          if (idx >= 0) {
              MOCK_DB.employees[idx] = { ...MOCK_DB.employees[idx], ...updates };
          }
          return;
      }

      const dbUpdates: any = {};
      if (updates.personalEmail !== undefined) dbUpdates.personal_email = updates.personalEmail;
      if (updates.mobile !== undefined) dbUpdates.mobile = updates.mobile;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.profilePhotoUrl !== undefined) dbUpdates.profile_photo_url = updates.profilePhotoUrl;

      const { error } = await this.client.from('employees').update(dbUpdates).eq('uan', uan);
      if (error) throw error;
      await this.logAudit(uan, 'EMP_UPDATE', 'Self', 'Updated Personal Profile');
  }

  // --- SALARY (Module 5) ---

  // NEW: Single Record Upsert
  async upsertSingleSalary(record: SalaryRecord, actorId: string): Promise<void> {
      const dbRecord = {
          employee_uan: record.employeeUan,
          site_id: record.siteId,
          month: record.month,
          year: record.year,
          basic: record.basic,
          hra: record.hra,
          allowances: record.allowances,
          pf_deduction: record.pfDeduction,
          tax_deduction: record.taxDeduction,
          is_locked: true
      };

      if (this.mockMode) {
          const net = record.basic + record.hra + record.allowances - record.pfDeduction - record.taxDeduction;
          const idx = MOCK_DB.salary_records.findIndex(x => 
              x.employeeUan === record.employeeUan && 
              x.month === record.month && 
              x.year === record.year && 
              x.siteId === record.siteId
          );
          if (idx >= 0) {
              MOCK_DB.salary_records[idx] = { ...record, id: MOCK_DB.salary_records[idx].id, netSalary: net };
          } else {
              MOCK_DB.salary_records.push({ ...record, id: `sal-${Date.now()}`, netSalary: net });
          }
          return;
      }

      const { error } = await this.client.from('salary_records')
          .upsert(dbRecord, { onConflict: 'employee_uan, month, year, site_id' });

      if (error) throw error;
      await this.logAudit(actorId, 'SALARY_UPSERT', record.employeeUan, `Updated Salary for ${record.month}/${record.year}`);
  }

  // NEW: Delete Salary Record
  async deleteSalaryRecord(recordId: string, actorId: string): Promise<void> {
      if (this.mockMode) {
          MOCK_DB.salary_records = MOCK_DB.salary_records.filter(r => r.id !== recordId);
          return;
      }
      const { error } = await this.client.from('salary_records').delete().eq('id', recordId);
      if (error) throw error;
      await this.logAudit(actorId, 'SALARY_DELETE', recordId, 'Removed salary record');
  }

  async uploadSalaryData(records: SalaryRecord[], actorId: string): Promise<{processed: number, skipped: number}> {
    if (this.mockMode) {
        let processed = 0;
        records.forEach(r => {
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

  // Updated to include ID
  async getEmployeeSalaryHistory(uan: string): Promise<{id: string, month: number, year: number}[]> {
      if (this.mockMode) {
          return MOCK_DB.salary_records
            .filter(r => r.employeeUan === uan)
            .map(r => ({ id: r.id, month: r.month, year: r.year }))
            .sort((a,b) => (b.year - a.year) || (b.month - a.month));
      }
      const { data } = await this.client.from('salary_records')
        .select('id, month, year')
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
          id: data.id, 
          clientId: data.client_id, 
          name: data.name, 
          logoUrl: data.logo_url,
          signatureUrl: data.signature_url,
          stampUrl: data.stamp_url,
          email: data.email, 
          mobile: data.mobile, 
          address: data.address
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
          status: e.status, addedBy: e.added_by, joinedDate: e.joined_date,
          // New Fields
          profilePhotoUrl: e.profile_photo_url,
          personalEmail: e.personal_email,
          mobile: e.mobile,
          address: e.address
      };
  }
}

export const dbService = new DBService();