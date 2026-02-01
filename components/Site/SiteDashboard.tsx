import React, { useState, useEffect } from 'react';
import { User, Employee, SiteStatus, EmployeeRole, EmployeeStatus, Site } from '../../types';
import { dbService } from '../../services/mockDb';
import { Users, UserPlus, FileText, AlertTriangle, ShieldCheck, ClipboardCheck, Loader2, CheckCircle, X } from 'lucide-react';

interface Props {
  user: User;
}

const SiteDashboard: React.FC<Props> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [siteDetails, setSiteDetails] = useState<Site | undefined>(undefined);
  
  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: '',
    uan: '',
    role: EmployeeRole.HELPER
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
      setFeedback({ type, message });
      setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    // Keep loading indicator localized to data refresh
    if(!siteDetails) setLoading(true);
    
    if (user.siteId) {
        try {
            const [empData, siteData] = await Promise.all([
                dbService.getSiteEmployees(user.siteId),
                dbService.getSiteDetails(user.siteId)
            ]);
            setEmployees(empData);
            setSiteDetails(siteData);
        } catch(e) {
            console.error(e);
            showNotification('error', "Failed to load site data.");
        }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user.siteId]);

  const isSiteClosed = siteDetails?.status === SiteStatus.CLOSED;

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.companyId || !user.siteId) return;
    setIsSubmitting(true);

    const emp: Employee = {
      name: newEmp.name,
      uan: newEmp.uan,
      role: newEmp.role,
      companyId: user.companyId,
      siteId: user.siteId,
      status: EmployeeStatus.PENDING,
      addedBy: user.id,
      joinedDate: new Date().toISOString().split('T')[0]
    };

    try {
      await dbService.addEmployee(emp);
      setShowAddForm(false);
      setNewEmp({ name: '', uan: '', role: EmployeeRole.HELPER });
      await loadData(); 
      showNotification('success', "Employee added. Waiting for HR approval.");
    } catch (err: any) {
      showNotification('error', err.message || "Failed to add employee.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const complianceScore = Math.round((employees.filter(e => e.status === EmployeeStatus.APPROVED).length / (employees.length || 1)) * 100);

  if (loading && !siteDetails) {
      return <div className="h-full flex items-center justify-center text-slate-500 gap-2"><Loader2 className="animate-spin" /> Loading Site Data...</div>
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* Toast Notification Banner */}
      {feedback && (
          <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-xl border-l-4 animate-fade-in-up flex items-center gap-3 ${feedback.type === 'success' ? 'bg-white border-green-500 text-slate-800' : 'bg-white border-red-500 text-slate-800'}`}>
              {feedback.type === 'success' ? <CheckCircle className="text-green-500 w-5 h-5" /> : <AlertTriangle className="text-red-500 w-5 h-5" />}
              <span className="font-medium text-sm">{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="ml-2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
      )}

      {/* Site Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 md:px-8 md:py-6 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
             {siteDetails?.logoUrl && (
                 <img src={siteDetails.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg border border-slate-100 object-cover" />
             )}
             <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-800">{siteDetails?.name || 'Unknown Site'}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${complianceScore === 100 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                    {complianceScore}% Compliance
                    </span>
                </div>
                <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                {siteDetails?.address}
                {isSiteClosed && <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold border border-red-100">SITE CLOSED</span>}
                </p>
             </div>
          </div>
          {!isSiteClosed && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
           <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col items-start gap-2">
              <div className="p-2 bg-blue-50 rounded-full text-blue-600"><Users className="w-5 h-5" /></div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{employees.length}</div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Staff</div>
              </div>
           </div>
           <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col items-start gap-2">
              <div className="p-2 bg-orange-50 rounded-full text-orange-600"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{employees.filter(e => e.status === EmployeeStatus.PENDING).length}</div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Pending</div>
              </div>
           </div>
           <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col items-start gap-2">
              <div className="p-2 bg-green-50 rounded-full text-green-600"><ShieldCheck className="w-5 h-5" /></div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{employees.filter(e => e.status === EmployeeStatus.APPROVED).length}</div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Active</div>
              </div>
           </div>
           <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col items-start gap-2">
              <div className="p-2 bg-purple-50 rounded-full text-purple-600"><ClipboardCheck className="w-5 h-5" /></div>
              <div>
                <div className="text-2xl font-bold text-slate-800">100%</div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Docs</div>
              </div>
           </div>
        </div>

        {/* Employee List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
             <h3 className="font-semibold text-slate-700">Employee Roster</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                    <th className="px-6 py-4">Name / Role</th>
                    <th className="px-6 py-4">UAN</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Documents</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {employees.map(emp => (
                    <tr key={emp.uan} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.role}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{emp.uan}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{emp.joinedDate}</td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        emp.status === EmployeeStatus.APPROVED ? 'bg-green-100 text-green-800' :
                        emp.status === EmployeeStatus.PENDING ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {emp.status}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1">
                        <FileText className="w-3 h-3" /> View Docs
                        </button>
                    </td>
                    </tr>
                ))}
                {employees.length === 0 && (
                    <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No employees found for this site.</td>
                    </tr>
                )}
                </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Employee Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-semibold">Add New Employee</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={newEmp.name}
                  onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">UAN (Unique ID)</label>
                  <input 
                    required
                    type="text" 
                    value={newEmp.uan}
                    onChange={e => setNewEmp({...newEmp, uan: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select 
                    value={newEmp.role}
                    onChange={e => setNewEmp({...newEmp, role: e.target.value as EmployeeRole})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {Object.values(EmployeeRole).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-sm"
                >Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-900 shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                >
                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                    Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDashboard;