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

// (Confirmation Modal Component remains the same)
const ConfirmationModal: React.FC<{ isOpen: boolean; title: string; message: string; confirmText?: string; confirmStyle?: 'danger' | 'primary'; onConfirm: () => void; onCancel: () => void; isLoading: boolean; }> = ({ isOpen, title, message, confirmText = "Confirm", confirmStyle = 'primary', onConfirm, onCancel, isLoading }) => {
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
                        <button onClick={onCancel} disabled={isLoading} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors">Cancel</button>
                        <button onClick={onConfirm} disabled={isLoading} className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors flex items-center gap-2 ${confirmStyle === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{isLoading && <Loader2 className="w-3 h-3 animate-spin" />}{confirmText}</button>
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
  const [pendingEmployees, setPendingEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sites' | 'approvals' | 'salary' | 'audit' | 'settings'>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Salary State
  const [salaryFile, setSalaryFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Sites State
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSite, setNewSite] = useState<Partial<Site>>({ name: '', address: '', status: SiteStatus.ACTIVE });
  const [siteLogo, setSiteLogo] = useState<File | null>(null);
  const [isSiteSaving, setIsSiteSaving] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
      setFeedback({ type, message });
      setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    try {
      const [fStats, fSites, fPending, fLogs] = await Promise.all([
        dbService.getHRStats(),
        dbService.getAllSites(),
        dbService.getPendingEmployees(),
        dbService.getAuditLogs()
      ]);
      setStats(fStats);
      setSites(fSites);
      setPendingEmployees(fPending);
      setAuditLogs(fLogs);
    } catch (e) {
      console.error(e);
      showNotification('error', "Failed to load dashboard data. Check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- APPROVALS ---
  const handleApproval = async (uan: string, approved: boolean) => {
      setProcessingId(`approval-${uan}`);
      try {
          await dbService.approveEmployee(uan, approved, 'HR_ADMIN');
          showNotification('success', approved ? "Approved" : "Rejected");
          await loadData();
      } catch (e: any) {
          showNotification('error', e.message);
      } finally {
          setProcessingId(null);
      }
  };

  // --- SALARY UPLOAD (UAN Mapped) ---
  const downloadTemplate = () => {
    const headers = ['UAN', 'Month', 'Year', 'Basic', 'HRA', 'Allowances', 'PF_Deduction', 'Tax_Deduction'];
    const ws = utils.aoa_to_sheet([headers]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Salary_Template");
    writeFile(wb, "Konark_Salary_Template.xlsx");
  };

  const handleSalaryUpload = async () => {
      if (!salaryFile) return;
      setIsUploading(true);
      setUploadStatus('Processing file...');
      try {
          const ab = await salaryFile.arrayBuffer();
          const wb = read(ab);
          const sheet = wb.Sheets[wb.SheetNames[0]];
          if (!sheet) throw new Error("No sheet found in Excel file");

          const data = utils.sheet_to_json(sheet) as any[];
          
          const records: SalaryRecord[] = [];
          const invalidUans: string[] = [];

          // Safe Parsing Helper
          const parseNum = (val: any) => {
              const n = parseFloat(val);
              return isNaN(n) ? 0 : n;
          };

          for (const row of data) {
              const uan = row.UAN ? String(row.UAN).trim() : '';
              
              if (!/^\d{12}$/.test(uan)) {
                  if(uan) invalidUans.push(uan);
                  continue;
              }
              
              records.push({
                  id: '', // Generated by DB
                  employeeUan: uan,
                  month: parseNum(row.Month),
                  year: parseNum(row.Year),
                  basic: parseNum(row.Basic),
                  hra: parseNum(row.HRA),
                  allowances: parseNum(row.Allowances),
                  pfDeduction: parseNum(row.PF_Deduction),
                  taxDeduction: parseNum(row.Tax_Deduction),
                  isLocked: true
              });
          }

          if (records.length > 0) {
              const count = await dbService.uploadSalaryData(records, 'HR_ADMIN');
              setUploadStatus(`Success: ${count} uploaded. ${invalidUans.length > 0 ? `${invalidUans.length} rows skipped (Invalid UAN).` : ''}`);
              showNotification('success', "Batch processed successfully.");
          } else {
              setUploadStatus("No valid records found in file. Check column headers.");
          }
      } catch (e: any) {
          setUploadStatus("Upload Failed: " + e.message);
      } finally {
          setIsUploading(false);
          setSalaryFile(null);
      }
  };

  // --- SITES ---
  const handleSaveSite = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSiteSaving(true);
      try {
          let logoUrl = newSite.logoUrl;
          if (siteLogo) {
             logoUrl = await dbService.uploadSiteLogo(siteLogo);
          }

          // Hardcoded Company ID for this version as per spec
          await dbService.createSite({ ...newSite, logoUrl, companyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
          showNotification('success', "Site created.");
          setShowAddSite(false);
          setNewSite({ name: '', address: '', status: SiteStatus.ACTIVE }); // Reset form
          setSiteLogo(null);
          await loadData();
      } catch (e: any) {
          showNotification('error', e.message);
      } finally {
          setIsSiteSaving(false);
      }
  };

  // Nav Button Component
  const NavBtn = ({ id, label, icon: Icon, badge }: any) => (
    <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
      <Icon className="w-4 h-4" /> <span>{label}</span>
      {badge > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{badge}</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800">HR Console</h1>
            <p className="text-xs text-slate-500">Secure Admin Access</p>
          </div>
          <div className="flex gap-2">
             <NavBtn id="overview" label="Overview" icon={Activity} />
             <NavBtn id="sites" label="Sites" icon={Building2} />
             <NavBtn id="approvals" label="Approvals" icon={CheckCircle} badge={pendingEmployees.length} />
             <NavBtn id="salary" label="Payroll" icon={FileSpreadsheet} />
             <NavBtn id="audit" label="Audit" icon={ShieldAlert} />
          </div>
      </header>

      {/* Notifications */}
      {feedback && (
          <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-xl border-l-4 flex items-center gap-3 ${feedback.type === 'success' ? 'bg-white border-green-500 text-slate-800' : 'bg-white border-red-500 text-slate-800'}`}>
              <span className="font-medium text-sm">{feedback.message}</span>
          </div>
      )}

      <main className="flex-1 p-6 overflow-y-auto">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs uppercase text-slate-400 font-bold">Total Staff</h3>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalEmployees || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs uppercase text-slate-400 font-bold">Pending</h3>
                    <p className="text-2xl font-bold text-slate-800">{stats.pendingApprovals || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs uppercase text-slate-400 font-bold">Active Sites</h3>
                    <p className="text-2xl font-bold text-slate-800">{stats.activeSites || 0}</p>
                </div>
            </div>
        )}

        {/* APPROVALS */}
        {activeTab === 'approvals' && (
            <div className="space-y-4">
                {pendingEmployees.length === 0 ? <p className="text-center text-slate-500">No pending approvals.</p> : pendingEmployees.map(emp => (
                    <div key={emp.uan} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-slate-800">{emp.name}</h4>
                            <p className="text-sm text-slate-500 font-mono">UAN: {emp.uan}</p>
                            <p className="text-xs text-slate-400">Role: {emp.role}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleApproval(emp.uan, false)} className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Reject</button>
                            <button onClick={() => handleApproval(emp.uan, true)} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900">Approve</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* PAYROLL */}
        {activeTab === 'salary' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-2xl mx-auto">
                <FileSpreadsheet className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800">Bulk Salary Processing</h2>
                <p className="text-slate-500 mb-6">Upload Excel with 12-digit UANs.</p>
                
                <div className="flex flex-col gap-4 max-w-sm mx-auto">
                    <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
                        <Download className="w-4 h-4" /> Download Template
                    </button>
                    <input type="file" accept=".xlsx" onChange={e => setSalaryFile(e.target.files?.[0] || null)} className="border p-2 rounded block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    <button onClick={handleSalaryUpload} disabled={isUploading || !salaryFile} className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {isUploading ? 'Processing...' : 'Upload & Process'}
                    </button>
                </div>
                {uploadStatus && <div className="mt-4 text-sm font-medium text-slate-600 bg-slate-100 p-2 rounded">{uploadStatus}</div>}
            </div>
        )}

        {/* SITES */}
        {activeTab === 'sites' && (
            <div>
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-800">Site Management</h3>
                     <button onClick={() => setShowAddSite(true)} className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium">Add Site</button>
                 </div>
                 <div className="grid gap-4">
                     {sites.length === 0 ? <p className="text-slate-500 p-4">No sites found.</p> : sites.map(s => (
                         <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                             <div className="flex items-center gap-4">
                                 {s.logoUrl ? (
                                     <img src={s.logoUrl} alt={s.name} className="w-12 h-12 rounded-lg object-contain border border-slate-100 bg-slate-50" />
                                 ) : (
                                     <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                         <Building2 className="w-6 h-6" />
                                     </div>
                                 )}
                                 <div>
                                     <h4 className="font-bold text-slate-800">{s.name}</h4>
                                     <p className="text-sm text-slate-500">{s.address}</p>
                                     <div className="flex gap-2 mt-1">
                                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{s.city || 'Unknown City'}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${s.status === SiteStatus.ACTIVE ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{s.status}</span>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
        )}
      </main>

      {/* ADD SITE MODAL */}
      {showAddSite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg">Add New Site</h3>
                     <button onClick={() => setShowAddSite(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleSaveSite} className="space-y-3">
                      <input required placeholder="Site Name" className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newSite.name} onChange={e => setNewSite({...newSite, name: e.target.value})} />
                      <input required placeholder="Address" className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newSite.address} onChange={e => setNewSite({...newSite, address: e.target.value})} />
                      <input placeholder="City" className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newSite.city} onChange={e => setNewSite({...newSite, city: e.target.value})} />
                      
                      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                          <label className="block text-xs font-bold text-slate-500 mb-2 uppercase flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Site Logo (Optional)
                          </label>
                          <input type="file" accept="image/*" onChange={e => setSiteLogo(e.target.files?.[0] || null)} className="text-sm w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-blue-50 border border-slate-200 rounded-lg cursor-pointer" />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowAddSite(false)} className="flex-1 border border-slate-300 p-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                          <button type="submit" disabled={isSiteSaving} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white p-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                              {isSiteSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                              Create Site
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
export default HRDashboard;