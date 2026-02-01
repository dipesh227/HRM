import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/mockDb';
import { Site, EmployeeStatus, SiteStatus, SalaryRecord, AuditLog, UserRole, User, Employee } from '../../types';
import { 
  BarChart3, Users, Building2, AlertCircle, CheckCircle, XCircle, 
  Lock, Unlock, Upload, FileSpreadsheet, Activity, Download, 
  ShieldAlert, Settings, PieChart, Plus, UserPlus, Search, Edit3, X, Save, Loader2, AlertTriangle, Eye, Image as ImageIcon, Trash2, MapPin, Phone, Mail, User as UserIcon, Hash, IndianRupee
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell } from 'recharts';
import { read, utils, writeFile } from 'xlsx';

// --- SUB-COMPONENTS ---

// Confirmation Modal Component
const ConfirmationModal: React.FC<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmStyle?: 'danger' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}> = ({ isOpen, title, message, confirmText = "Confirm", confirmStyle = 'primary', onConfirm, onCancel, isLoading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up border border-slate-200">
                <div className="p-6 text-center">
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmStyle === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {confirmStyle === 'danger' ? <AlertTriangle className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 mb-6">{message}</p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={onCancel} 
                            disabled={isLoading}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors flex items-center gap-2 ${confirmStyle === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HRDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [sites, setSites] = useState<Site[]>([]);
  const [incharges, setIncharges] = useState<User[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sites' | 'team' | 'approvals' | 'salary' | 'audit' | 'reports' | 'settings'>('overview');
  
  // Feedback System
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Confirmation State
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; action: () => void; style: 'danger' | 'primary' }>({
      isOpen: false, title: '', message: '', action: () => {}, style: 'primary'
  });

  // Salary Upload State
  const [salaryFile, setSalaryFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Single Salary State
  const [salaryMode, setSalaryMode] = useState<'BULK' | 'SINGLE'>('BULK');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [singleSalaryData, setSingleSalaryData] = useState<Partial<SalaryRecord>>({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      basic: 0, hra: 0, allowances: 0, pfDeduction: 0, taxDeduction: 0
  });

  // Modal States
  const [showAddSite, setShowAddSite] = useState(false);
  const [isEditingSite, setIsEditingSite] = useState<string | null>(null);
  const [showAddIncharge, setShowAddIncharge] = useState(false);
  const [viewSite, setViewSite] = useState<Site | null>(null);
  
  // Form States
  const [newSite, setNewSite] = useState<Partial<Site>>({ 
      name: '', siteCode: '',
      address: '', city: '', state: '', pincode: '',
      email: '', mobile: '',
      managerName: '', managerMobile: '',
      logoUrl: ''
  });
  const [newIncharge, setNewIncharge] = useState<Partial<User>>({ name: '', uan: '', password: '', siteId: '' });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<any>({ siteCosts: [], totalPayroll: 0 });
  const [config, setConfig] = useState<any>({});

  const showNotification = (type: 'success' | 'error', message: string) => {
      setFeedback({ type, message });
      setTimeout(() => setFeedback(null), 4000);
  };

  // Helper for Indian Currency Formatting
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const loadData = async () => {
    // Only show full page loader on initial mount
    if(!stats.totalCompanies) setIsLoading(true);
    try {
      const [
        fetchedStats, fetchedSites, fetchedPending, fetchedLogs, fetchedAnalytics, fetchedConfig, fetchedIncharges
      ] = await Promise.all([
        dbService.getHRStats(),
        dbService.getAllSites(),
        dbService.getPendingEmployees(),
        dbService.getAuditLogs(),
        dbService.getAnalytics(),
        dbService.getConfig(),
        dbService.getAllIncharges()
      ]);

      setStats(fetchedStats);
      setSites(fetchedSites);
      setPendingEmployees(fetchedPending);
      setAuditLogs(fetchedLogs);
      setAnalytics(fetchedAnalytics);
      setConfig(fetchedConfig);
      setIncharges(fetchedIncharges);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
      showNotification('error', "Failed to refresh dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- SITE OPERATIONS ---

  const handleToggleSite = async (siteId: string) => {
    setProcessingId(`site-${siteId}`);
    try {
      await dbService.toggleSiteStatus(siteId);
      await loadData(); // Reload to get updated lists
      showNotification('success', "Site status updated successfully.");
    } catch (e) {
      showNotification('error', "Failed to update site status.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation for direct upload to prevent massive strings
      if (file.size > 500000) { // 500KB limit for base64
          showNotification('error', "Image too large for direct storage. Use URL or compress < 500KB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSite(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddSiteModal = () => {
      setNewSite({ 
          name: '', siteCode: '',
          address: '', city: '', state: '', pincode: '',
          email: '', mobile: '',
          managerName: '', managerMobile: '',
          logoUrl: ''
      });
      setIsEditingSite(null);
      setShowAddSite(true);
  };

  const openEditSiteModal = (site: Site) => {
      setNewSite({ 
          name: site.name, 
          siteCode: site.siteCode || '',
          address: site.address, 
          city: site.city || '',
          state: site.state || '',
          pincode: site.pincode || '',
          email: site.email || '',
          mobile: site.mobile || '',
          managerName: site.managerName || '',
          managerMobile: site.managerMobile || '',
          logoUrl: site.logoUrl
      });
      setIsEditingSite(site.id);
      setShowAddSite(true);
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingId('save-site');
    try {
      if (isEditingSite) {
          await dbService.updateSite(isEditingSite, newSite);
          showNotification('success', "Site updated successfully.");
      } else {
          // Mock Company ID for demo, in real app select from dropdown
          const defaultCompany = 'c001-test-uuid-0000'; 
          await dbService.createSite({ ...newSite, companyId: defaultCompany });
          showNotification('success', "New site created successfully.");
      }
      setShowAddSite(false);
      setNewSite({ name: '', address: '', logoUrl: '' });
      await loadData();
    } catch (err: any) {
      showNotification('error', err.message || "Error saving site.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteSiteRequest = (siteId: string) => {
      setConfirmState({
          isOpen: true,
          title: "Delete Site",
          message: "Are you sure you want to delete this site? This action cannot be undone if there are no dependencies. Sites with active employees cannot be deleted.",
          style: 'danger',
          action: async () => {
              setProcessingId(`delete-site-${siteId}`);
              try {
                  await dbService.deleteSite(siteId);
                  showNotification('success', "Site deleted successfully.");
                  await loadData();
              } catch (err: any) {
                  showNotification('error', err.message || "Failed to delete site.");
              } finally {
                  setProcessingId(null);
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
              }
          }
      });
  };

  // --- USER OPERATIONS ---

  const handleCreateIncharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingId('create-incharge');
    try {
      const defaultCompany = 'c001-test-uuid-0000';
      await dbService.createSystemUser({
        ...newIncharge,
        role: UserRole.SITE_INCHARGE,
        companyId: defaultCompany,
        email: newIncharge.uan 
      });
      setShowAddIncharge(false);
      setNewIncharge({ name: '', uan: '', password: '', siteId: '' });
      await loadData();
      showNotification('success', "Site Incharge account created.");
    } catch (err: any) {
      showNotification('error', err.message || "Error creating user.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUserRequest = (userId: string) => {
      setConfirmState({
          isOpen: true,
          title: "Remove Incharge",
          message: "Are you sure you want to remove this system user? This will revoke their access immediately.",
          style: 'danger',
          action: async () => {
              try {
                  await dbService.deleteUser(userId);
                  showNotification('success', "User deleted successfully.");
                  await loadData();
              } catch (err: any) {
                  showNotification('error', "Failed to delete user.");
              } finally {
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
              }
          }
      });
  };

  // --- PAYROLL & EMPLOYEE OPERATIONS ---

  const handleSearchEmployee = async (val: string) => {
      setEmployeeSearch(val);
      if(val.length > 2) {
          const res = await dbService.searchEmployees(val);
          setSearchResults(res);
      } else {
          setSearchResults([]);
      }
  };

  const handleSelectEmployee = (emp: Employee) => {
      setSelectedEmployee(emp);
      setSearchResults([]);
      setEmployeeSearch(emp.name);
      // Reset form
      setSingleSalaryData({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          basic: 0, hra: 0, allowances: 0, pfDeduction: 0, taxDeduction: 0
      });
  };

  const handleSaveSingleSalary = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedEmployee) return;
      setProcessingId('save-salary');

      const basic = Number(singleSalaryData.basic);
      const hra = Number(singleSalaryData.hra);
      const allowances = Number(singleSalaryData.allowances);
      const pf = Number(singleSalaryData.pfDeduction);
      const tax = Number(singleSalaryData.taxDeduction);
      const net = basic + hra + allowances - pf - tax;

      const record: SalaryRecord = {
          id: '',
          employeeId: selectedEmployee.id,
          month: Number(singleSalaryData.month),
          year: Number(singleSalaryData.year),
          basic, hra, allowances, pfDeduction: pf, taxDeduction: tax,
          netSalary: net,
          isLocked: true
      };

      try {
          await dbService.uploadSalaryData([record]);
          showNotification('success', "Salary Record Saved Successfully!");
          setSelectedEmployee(null);
          setEmployeeSearch('');
      } catch (err) {
          showNotification('error', "Failed to save record.");
      } finally {
          setProcessingId(null);
      }
  };

  const handleApproval = async (empId: string, approved: boolean) => {
    setProcessingId(`approval-${empId}`);
    try {
      await dbService.approveEmployee(empId, approved);
      await loadData();
      showNotification('success', approved ? "Employee Approved" : "Employee Rejected");
    } catch (e) {
      showNotification('error', "Action failed. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const downloadTemplate = () => {
    const headers = ['UAN', 'Month', 'Year', 'Basic', 'HRA', 'Allowances', 'PF_Deduction', 'Tax_Deduction'];
    const ws = utils.aoa_to_sheet([headers]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Salary_Template");
    writeFile(wb, "Salary_Upload_Template.xlsx");
  };

  const handleSalaryUpload = async () => {
    if (!salaryFile) return;
    setUploadStatus('');
    setIsUploading(true);
    
    try {
      const arrayBuffer = await salaryFile.arrayBuffer();
      const wb = read(arrayBuffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = utils.sheet_to_json(ws) as any[];
      const uanMap = await dbService.getAllEmployeesMap();
      const records: SalaryRecord[] = [];
      let skippedCount = 0;

      for (const row of data) {
        if (!row.UAN) { skippedCount++; continue; }
        const uanKey = String(row.UAN).trim();
        const empId = uanMap.get(uanKey);
        
        if (empId) {
            const basic = Number(row.Basic) || 0;
            const hra = Number(row.HRA) || 0;
            const allowances = Number(row.Allowances) || 0;
            const pf = Number(row.PF_Deduction) || 0;
            const tax = Number(row.Tax_Deduction) || 0;
            const net = basic + hra + allowances - pf - tax;

            records.push({
                id: `sal_${Date.now()}_${Math.random()}`,
                employeeId: empId,
                month: Number(row.Month),
                year: Number(row.Year),
                basic, hra, allowances, pfDeduction: pf, taxDeduction: tax, netSalary: net
            });
        } else {
            skippedCount++;
        }
      }

      if (records.length > 0) {
        const addedCount = await dbService.uploadSalaryData(records);
        setUploadStatus(`Success: ${addedCount} records processed. ${skippedCount > 0 ? `${skippedCount} skipped.` : ''}`);
        showNotification('success', "Bulk upload completed.");
        setSalaryFile(null);
        await loadData();
      } else {
        setUploadStatus('Warning: No valid records found.');
        showNotification('error', "No valid records found in file.");
      }
    } catch (error) {
        setUploadStatus('Error: Failed to process file.');
        showNotification('error', "Failed to parse file.");
    } finally {
        setIsUploading(false);
    }
  };

  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'];

  // Navigation Button
  const NavBtn = ({ id, label, icon: Icon, badge }: any) => (
    <button 
      onClick={() => setActiveTab(id)} 
      className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors w-full md:w-auto ${activeTab === id ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border border-transparent'}`}
    >
      <Icon className="w-5 h-5 md:w-4 md:h-4" />
      <span className="hidden md:inline">{label}</span>
      {badge > 0 && <span className="absolute top-0 right-0 md:static bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* Confirmation Modal (Global for Dashboard) */}
      <ConfirmationModal 
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmStyle={confirmState.style}
          confirmText="Yes, Proceed"
          onConfirm={confirmState.action}
          onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
          isLoading={processingId !== null && processingId.startsWith('delete')}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Management Console</h1>
            <p className="text-slate-500 text-xs md:text-sm">HRM for Multi-site Management • Level 2 Access</p>
          </div>
          {/* Mobile Scrollable Nav */}
          <div className="flex overflow-x-auto w-full md:w-auto gap-2 pb-2 md:pb-0 hide-scrollbar justify-start md:justify-end">
             <NavBtn id="overview" label="Overview" icon={Activity} />
             <NavBtn id="sites" label="Sites" icon={Building2} />
             <NavBtn id="team" label="Team" icon={Users} />
             <NavBtn id="approvals" label="Approvals" icon={CheckCircle} badge={pendingEmployees.length} />
             <NavBtn id="salary" label="Payroll" icon={FileSpreadsheet} />
             <NavBtn id="audit" label="Audit" icon={ShieldAlert} />
             <NavBtn id="settings" label="Config" icon={Settings} />
          </div>
        </div>
      </header>
      
      {/* Toast Notification Banner */}
      {feedback && (
          <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-xl border-l-4 animate-fade-in-up flex items-center gap-3 ${feedback.type === 'success' ? 'bg-white border-green-500 text-slate-800' : 'bg-white border-red-500 text-slate-800'}`}>
              {feedback.type === 'success' ? <CheckCircle className="text-green-500 w-5 h-5" /> : <AlertTriangle className="text-red-500 w-5 h-5" />}
              <span className="font-medium text-sm">{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="ml-2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
      )}

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* ... (Existing Cards remain same) ... */}
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                   <div className="p-2 bg-blue-50 rounded-lg"><Building2 className="h-5 w-5 text-blue-600" /></div>
                </div>
                <h3 className="text-slate-500 text-xs font-medium uppercase">Companies</h3>
                <p className="text-2xl font-bold text-slate-800">{stats.totalCompanies}</p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
                 <div className="flex justify-between items-start mb-2">
                   <div className="p-2 bg-indigo-50 rounded-lg"><Activity className="h-5 w-5 text-indigo-600" /></div>
                </div>
                <h3 className="text-slate-500 text-xs font-medium uppercase">Active Sites</h3>
                <p className="text-2xl font-bold text-slate-800">{stats.activeSites}</p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
                 <div className="flex justify-between items-start mb-2">
                   <div className="p-2 bg-orange-50 rounded-lg"><AlertCircle className="h-5 w-5 text-orange-600" /></div>
                </div>
                <h3 className="text-slate-500 text-xs font-medium uppercase">Pending</h3>
                <p className="text-2xl font-bold text-slate-800">{stats.pendingApprovals}</p>
              </div>
               <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
                 <div className="flex justify-between items-start mb-2">
                   <div className="p-2 bg-emerald-50 rounded-lg"><Users className="h-5 w-5 text-emerald-600" /></div>
                </div>
                <h3 className="text-slate-500 text-xs font-medium uppercase">Total Staff</h3>
                <p className="text-2xl font-bold text-slate-800">{stats.totalEmployees}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Workforce Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                        { name: 'Sites', count: stats.totalSites },
                        { name: 'Pending', count: stats.pendingApprovals },
                        { name: 'Staff', count: stats.totalEmployees }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#334155" radius={[4, 4, 0, 0]} barSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Financial Overview</h3>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="h-48 w-48 relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <RePie>
                                  <Pie data={analytics.siteCosts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80}>
                                      {analytics.siteCosts.map((_: any, index: number) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                              </RePie>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-xs font-bold text-slate-400">COST</span>
                          </div>
                      </div>
                      <div className="flex-1 w-full">
                           <div className="space-y-3">
                              {analytics.siteCosts.slice(0, 3).map((site: any, i: number) => (
                                  <div key={i} className="flex justify-between text-sm">
                                      <span className="flex items-center gap-2 text-slate-600">
                                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                          {site.name}
                                      </span>
                                      <span className="font-semibold">{formatINR(site.value)}</span>
                                  </div>
                              ))}
                           </div>
                           <div className="mt-4 pt-4 border-t border-slate-100">
                               <p className="text-xs text-slate-400 uppercase">Total Payroll</p>
                               <p className="text-2xl font-bold text-slate-800">{formatINR(analytics.totalPayroll)}</p>
                           </div>
                      </div>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* SITES TAB */}
        {activeTab === 'sites' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                 <div>
                    <h3 className="font-bold text-slate-800">Project Sites</h3>
                    <p className="text-xs text-slate-500 hidden md:block">Manage construction site locations and status.</p>
                 </div>
                 <button 
                   onClick={openAddSiteModal}
                   className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 shadow-md"
                 >
                   <Plus className="w-4 h-4" /> Add Site
                 </button>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left whitespace-nowrap">
                   <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                     <tr>
                       <th className="px-6 py-4">Site Details</th>
                       <th className="px-6 py-4">Location</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {sites.map(site => (
                       <tr key={site.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                {site.logoUrl ? (
                                    <img src={site.logoUrl} alt="logo" className="w-8 h-8 rounded object-cover border border-slate-200" />
                                ) : (
                                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                )}
                                <div>
                                    <div className="font-medium text-slate-800">{site.name}</div>
                                    <div className="text-xs text-slate-400">{site.siteCode ? `Code: ${site.siteCode}` : site.id}</div>
                                </div>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-slate-500 text-sm max-w-xs truncate">
                             {site.city && site.state ? `${site.city}, ${site.state}` : site.address}
                         </td>
                         <td className="px-6 py-4">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${site.status === SiteStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                             {site.status}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={() => setViewSite(site)}
                               className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                               title="View Details"
                             >
                                <Eye className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => openEditSiteModal(site)}
                               className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-100"
                               title="Edit Site"
                             >
                                <Edit3 className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => handleDeleteSiteRequest(site.id)}
                               className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                               title="Delete Site"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                             <div className="w-px h-4 bg-slate-200 mx-1"></div>
                             <button 
                               onClick={() => handleToggleSite(site.id)}
                               disabled={processingId === `site-${site.id}`}
                               className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                 site.status === SiteStatus.ACTIVE 
                                 ? 'border-red-200 text-red-600 hover:bg-red-50' 
                                 : 'border-green-200 text-green-600 hover:bg-green-50'
                               }`}
                             >
                               {processingId === `site-${site.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                               {site.status === SiteStatus.ACTIVE ? 'Close' : 'Active'}
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}

        {/* TEAM / INCHARGES TAB */}
        {activeTab === 'team' && (
           <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                 <div>
                    <h3 className="font-bold text-slate-800">Site Incharges</h3>
                    <p className="text-xs text-slate-500 hidden md:block">Manage access for site supervisors.</p>
                 </div>
                 <button 
                   onClick={() => setShowAddIncharge(true)}
                   className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 shadow-md"
                 >
                   <UserPlus className="w-4 h-4" /> Add Incharge
                 </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {incharges.map(user => {
                     const linkedSite = sites.find(s => s.id === user.siteId);
                     return (
                         <div key={user.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
                             <div className="flex items-start justify-between">
                                 <div className="flex gap-3">
                                     <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                                         {user.name.charAt(0)}
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-slate-800 text-sm">{user.name}</h4>
                                         <p className="text-xs text-slate-500 font-mono mt-0.5">{user.uan}</p>
                                         {linkedSite && (
                                             <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-100">
                                                 <Building2 className="w-3 h-3" /> {linkedSite.name}
                                             </div>
                                         )}
                                     </div>
                                 </div>
                                 <button 
                                    onClick={() => handleDeleteUserRequest(user.id)}
                                    className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Revoke Access"
                                 >
                                     <Trash2 className="w-4 h-4" />
                                 </button>
                             </div>
                             <div className="absolute top-5 right-5 text-green-600 bg-green-50 p-1 rounded-full pointer-events-none group-hover:opacity-0 transition-opacity">
                                 <CheckCircle className="w-4 h-4" />
                             </div>
                         </div>
                     );
                 })}
             </div>
           </div>
        )}

        {/* PAYROLL TAB */}
        {activeTab === 'salary' && (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Toggle Mode */}
            <div className="flex justify-center p-1 bg-white rounded-lg border border-slate-200 shadow-sm w-fit mx-auto">
                <button 
                  onClick={() => setSalaryMode('BULK')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${salaryMode === 'BULK' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Bulk Upload
                </button>
                <button 
                   onClick={() => setSalaryMode('SINGLE')}
                   className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${salaryMode === 'SINGLE' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Single Entry
                </button>
            </div>

            {salaryMode === 'BULK' ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                    <div className="inline-flex p-4 bg-blue-50 rounded-full mb-4">
                        <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Bulk Salary Upload</h2>
                    <p className="text-slate-500 mt-1 mb-6">Upload Excel (.xlsx) file containing salary data for multiple employees.</p>
                    
                    <div className="flex flex-col gap-4 max-w-sm mx-auto">
                        <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                            <Download className="w-4 h-4" /> Download Template
                        </button>

                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 hover:border-blue-400 transition-colors bg-slate-50 cursor-pointer relative">
                            <input 
                                type="file" 
                                accept=".xlsx, .xls"
                                onChange={(e) => setSalaryFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isUploading}
                            />
                            <div className="pointer-events-none">
                                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <span className="text-slate-700 font-medium block">{salaryFile ? salaryFile.name : 'Select Excel File'}</span>
                            </div>
                        </div>

                        <button 
                            disabled={!salaryFile || isUploading}
                            onClick={handleSalaryUpload}
                            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                        >
                            {isUploading ? 'Processing...' : 'Upload & Process'}
                        </button>
                    </div>
                    {uploadStatus && <div className="mt-4 text-sm font-medium text-slate-600">{uploadStatus}</div>}
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-slate-500" /> Manage Individual Salary
                    </h2>
                    
                    {/* Search */}
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input 
                           type="text" 
                           placeholder="Search by Name or UAN..." 
                           value={employeeSearch}
                           onChange={(e) => handleSearchEmployee(e.target.value)}
                           className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg mt-1 shadow-xl z-10 max-h-60 overflow-y-auto">
                                {searchResults.map(emp => (
                                    <div key={emp.id} onClick={() => handleSelectEmployee(emp)} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                                        <div className="font-bold text-slate-800 text-sm">{emp.name}</div>
                                        <div className="text-xs text-slate-500">{emp.role} • {emp.uan}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedEmployee && (
                        <form onSubmit={handleSaveSingleSalary} className="space-y-4 animate-fade-in">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center mb-4">
                                <div>
                                    <div className="text-sm font-bold text-slate-800">{selectedEmployee.name}</div>
                                    <div className="text-xs text-slate-500">UAN: {selectedEmployee.uan}</div>
                                </div>
                                <button type="button" onClick={() => setSelectedEmployee(null)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Month</label>
                                    <select 
                                        value={singleSalaryData.month}
                                        onChange={e => setSingleSalaryData({...singleSalaryData, month: Number(e.target.value)})}
                                        className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                                    >
                                        {[...Array(12)].map((_, i) => <option key={i} value={i+1}>{i+1}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Year</label>
                                    <input 
                                        type="number"
                                        value={singleSalaryData.year}
                                        onChange={e => setSingleSalaryData({...singleSalaryData, year: Number(e.target.value)})}
                                        className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Basic Salary</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-slate-400" />
                                        <input type="number" required className="w-full pl-6 p-2 border border-slate-300 rounded text-sm" value={singleSalaryData.basic} onChange={e => setSingleSalaryData({...singleSalaryData, basic: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">HRA</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-slate-400" />
                                        <input type="number" required className="w-full pl-6 p-2 border border-slate-300 rounded text-sm" value={singleSalaryData.hra} onChange={e => setSingleSalaryData({...singleSalaryData, hra: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Allowances</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-slate-400" />
                                        <input type="number" required className="w-full pl-6 p-2 border border-slate-300 rounded text-sm" value={singleSalaryData.allowances} onChange={e => setSingleSalaryData({...singleSalaryData, allowances: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-red-500 mb-1">PF Deduction</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-red-300" />
                                        <input type="number" required className="w-full pl-6 p-2 border border-red-200 bg-red-50 rounded text-sm" value={singleSalaryData.pfDeduction} onChange={e => setSingleSalaryData({...singleSalaryData, pfDeduction: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-red-500 mb-1">Tax Deduction</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-red-300" />
                                        <input type="number" required className="w-full pl-6 p-2 border border-red-200 bg-red-50 rounded text-sm" value={singleSalaryData.taxDeduction} onChange={e => setSingleSalaryData({...singleSalaryData, taxDeduction: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={processingId === 'save-salary'}
                                className="w-full py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 flex items-center justify-center gap-2 mt-4"
                            >
                                {processingId === 'save-salary' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Record
                            </button>
                        </form>
                    )}
                </div>
            )}
          </div>
        )}

        {/* APPROVALS TAB */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
             {pendingEmployees.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                 <div className="mx-auto h-12 w-12 text-slate-300 mb-3"><CheckCircle className="w-full h-full" /></div>
                 <h3 className="text-slate-900 font-medium">No pending approvals</h3>
               </div>
            ) : (
              pendingEmployees.map(emp => (
                <div key={emp.id} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm md:text-base">{emp.name}</h4>
                      <p className="text-xs md:text-sm text-slate-500">{emp.role} • Site ID: {emp.siteId}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => handleApproval(emp.id, false)}
                      disabled={processingId === `approval-${emp.id}`}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm transition-colors"
                    >
                      {processingId === `approval-${emp.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reject'}
                    </button>
                    <button 
                      onClick={() => handleApproval(emp.id, true)}
                      disabled={processingId === `approval-${emp.id}`}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-sm transition-colors"
                    >
                      {processingId === `approval-${emp.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SETTINGS / AUDIT */}
        {activeTab === 'audit' && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-slate-50 border-b border-slate-100 uppercase text-slate-500 font-semibold text-xs">
                   <tr>
                     <th className="px-6 py-4">Time</th>
                     <th className="px-6 py-4">Action</th>
                     <th className="px-6 py-4">Actor</th>
                     <th className="px-6 py-4">Details</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {auditLogs.map(log => (
                     <tr key={log.id} className="hover:bg-slate-50">
                       <td className="px-6 py-4 text-slate-500 text-xs">{new Date(log.timestamp).toLocaleDateString()}</td>
                       <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{log.action}</span></td>
                       <td className="px-6 py-4 font-medium">{log.actorName}</td>
                       <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{log.details}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        )}

      </main>

      {/* MODAL: SITE DETAILS */}
      {viewSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
            <div className="relative h-32 bg-slate-800 flex items-end p-6">
                <button 
                    onClick={() => setViewSite(null)}
                    className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4 translate-y-8">
                     <div className="h-24 w-24 bg-white rounded-xl shadow-lg border-4 border-white flex items-center justify-center overflow-hidden">
                         {viewSite.logoUrl ? (
                             <img src={viewSite.logoUrl} alt={viewSite.name} className="h-full w-full object-contain" />
                         ) : (
                             <Building2 className="w-10 h-10 text-slate-300" />
                         )}
                     </div>
                     <div className="mb-2">
                         <h2 className="text-2xl font-bold text-white">{viewSite.name}</h2>
                         <p className="text-slate-300 text-sm">{viewSite.city} {viewSite.state && `, ${viewSite.state}`}</p>
                     </div>
                </div>
            </div>
            
            <div className="pt-12 px-8 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1 */}
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs uppercase font-bold text-slate-400">Address / Location</label>
                            <div className="flex gap-2 mt-1">
                                <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-slate-800 font-medium">{viewSite.address}</p>
                                    <p className="text-slate-500 text-sm mt-1">{viewSite.city}, {viewSite.state} - {viewSite.pincode}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                             <label className="text-xs uppercase font-bold text-slate-400 mb-2 block">Manager Details</label>
                             <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-2">
                                <div className="flex gap-2 items-center">
                                    <UserIcon className="w-4 h-4 text-slate-400" />
                                    <p className="text-slate-800 text-sm font-medium">{viewSite.managerName || 'N/A'}</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <p className="text-slate-600 text-sm">{viewSite.managerMobile || 'N/A'}</p>
                                </div>
                             </div>
                        </div>

                        <div>
                            <label className="text-xs uppercase font-bold text-slate-400">Site Code</label>
                            <p className="text-slate-800 text-sm font-mono mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">{viewSite.siteCode || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-6">
                         <div>
                            <label className="text-xs uppercase font-bold text-slate-400">Current Status</label>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${viewSite.status === SiteStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {viewSite.status === SiteStatus.ACTIVE ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                    {viewSite.status}
                                </span>
                            </div>
                        </div>

                         <div>
                             <label className="text-xs uppercase font-bold text-slate-400 mb-2 block">Site Office Contact</label>
                             <div className="space-y-2">
                                <div className="flex gap-2 items-center">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <p className="text-slate-800 text-sm truncate">{viewSite.email || 'N/A'}</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <p className="text-slate-800 text-sm">{viewSite.mobile || 'N/A'}</p>
                                </div>
                             </div>
                        </div>

                        <div>
                             <label className="text-xs uppercase font-bold text-slate-400">System Actions</label>
                             <div className="flex gap-2 mt-2">
                                <button 
                                  onClick={() => {
                                      handleToggleSite(viewSite.id);
                                      setViewSite(null);
                                  }}
                                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium w-full"
                                >
                                    {viewSite.status === SiteStatus.ACTIVE ? 'Close Site' : 'Activate Site'}
                                </button>
                             </div>
                        </div>
                        {viewSite.logoUrl && (
                            <div className="border-t border-slate-100 pt-4">
                                <label className="text-xs uppercase font-bold text-slate-400 mb-2 block">Logo Source</label>
                                <div className="text-xs text-slate-500 break-all bg-slate-50 p-3 rounded border border-slate-100 font-mono max-h-20 overflow-y-auto">
                                    {viewSite.logoUrl.substring(0, 50)}...
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT SITE */}
      {showAddSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">{isEditingSite ? 'Edit Site Details' : 'Create New Site'}</h3>
                <button onClick={() => setShowAddSite(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-800" /></button>
            </div>
            <form onSubmit={handleSaveSite} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Site Name <span className="text-red-500">*</span></label>
                        <input required type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none text-sm" placeholder="e.g. Pune Site 1" value={newSite.name} onChange={e => setNewSite({...newSite, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Site Code</label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input type="text" className="w-full pl-9 p-2.5 border rounded-lg focus:ring-2 focus:ring-slate-500 outline-none text-sm" placeholder="KE-PUN-01" value={newSite.siteCode} onChange={e => setNewSite({...newSite, siteCode: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* Manager Details */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Manager Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Manager Name</label>
                            <input type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-slate-500 outline-none text-sm bg-white" placeholder="Full Name" value={newSite.managerName} onChange={e => setNewSite({...newSite, managerName: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Manager Mobile</label>
                            <input type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-slate-500 outline-none text-sm bg-white" placeholder="+91..." value={newSite.managerMobile} onChange={e => setNewSite({...newSite, managerMobile: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address <span className="text-red-500">*</span></label>
                    <textarea required rows={2} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none text-sm" placeholder="Plot No, Area, Landmark..." value={newSite.address} onChange={e => setNewSite({...newSite, address: e.target.value})} />
                </div>
                 
                 <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                        <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none text-sm" value={newSite.city} onChange={e => setNewSite({...newSite, city: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                        <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none text-sm" value={newSite.state} onChange={e => setNewSite({...newSite, state: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                        <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none text-sm" value={newSite.pincode} onChange={e => setNewSite({...newSite, pincode: e.target.value})} />
                    </div>
                </div>

                {/* Site Contact */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Site Mobile</label>
                        <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none text-sm" placeholder="+91..." value={newSite.mobile} onChange={e => setNewSite({...newSite, mobile: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Site Email</label>
                        <input type="email" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none text-sm" placeholder="site@konark.com" value={newSite.email} onChange={e => setNewSite({...newSite, email: e.target.value})} />
                    </div>
                </div>
                
                {/* Logo Upload Section */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Logo</label>
                    <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full border border-slate-300 rounded-lg p-2.5 flex items-center gap-2 text-slate-500 bg-white hover:bg-slate-50 transition-colors">
                                <ImageIcon className="w-4 h-4" />
                                <span className="text-sm truncate">Upload File...</span>
                            </div>
                        </div>
                        <span className="text-xs text-slate-400 self-center">OR</span>
                        <input 
                            type="text" 
                            className="flex-1 border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none text-sm" 
                            placeholder="Paste URL" 
                            value={newSite.logoUrl} 
                            onChange={e => setNewSite({...newSite, logoUrl: e.target.value})} 
                        />
                    </div>
                    {/* Preview */}
                    {newSite.logoUrl && (
                        <div className="mt-2 p-2 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-3">
                            <img src={newSite.logoUrl} alt="Preview" className="h-10 w-10 object-contain bg-white rounded border border-slate-100" />
                            <span className="text-xs text-green-600 font-medium">Preview Ready</span>
                            <button type="button" onClick={() => setNewSite({...newSite, logoUrl: ''})} className="ml-auto text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>

                <button 
                    type="submit" 
                    disabled={processingId === 'save-site'}
                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-colors flex justify-center items-center gap-2"
                >
                    {processingId === 'save-site' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEditingSite ? 'Update Site Details' : 'Create Site'}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD INCHARGE */}
      {showAddIncharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Add Site Incharge</h3>
                <button onClick={() => setShowAddIncharge(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-800" /></button>
            </div>
            <form onSubmit={handleCreateIncharge} className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input required type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none" value={newIncharge.name} onChange={e => setNewIncharge({...newIncharge, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Login ID / Email</label>
                    <input required type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none" value={newIncharge.uan} onChange={e => setNewIncharge({...newIncharge, uan: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input required type="password" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 outline-none" value={newIncharge.password} onChange={e => setNewIncharge({...newIncharge, password: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign Site</label>
                    <select required className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-slate-500 outline-none" value={newIncharge.siteId} onChange={e => setNewIncharge({...newIncharge, siteId: e.target.value})}>
                        <option value="">Select a Site</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <button 
                    type="submit" 
                    disabled={processingId === 'create-incharge'}
                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-colors flex justify-center items-center gap-2"
                >
                    {processingId === 'create-incharge' && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create User
                </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HRDashboard;