import React, { useState, useEffect } from 'react';
import { User, Employee, SiteStatus, EmployeeStatus, Site } from '../../types';
import { dbService } from '../../services/mockDb';
import { Users, UserPlus, AlertTriangle, ShieldCheck, ClipboardCheck, Loader2, CheckCircle, X, Building2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { StatCard } from '../UI/StatCard';
import { EmployeeList } from './EmployeeList';
import { NewEmployeeForm } from './NewEmployeeForm';

interface Props {
  user: User;
}

const SiteDashboard: React.FC<Props> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [siteDetails, setSiteDetails] = useState<Site | undefined>(undefined);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
      setFeedback({ type, message });
      setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
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

  useEffect(() => { loadData(); }, [user.siteId]);

  const isSiteClosed = siteDetails?.status === SiteStatus.CLOSED;
  const complianceScore = Math.round((employees.filter(e => e.status === EmployeeStatus.APPROVED).length / (employees.length || 1)) * 100);

  if (loading && !siteDetails) return <div className="h-full flex items-center justify-center gap-2 text-slate-500"><Loader2 className="animate-spin" /> Loading Site Data...</div>;

  return (
    <div className="flex flex-col h-full bg-ios-bg dark:bg-black relative transition-colors duration-200">
      
      {/* Site Header Card */}
      <div className="px-4 py-6 max-w-7xl mx-auto w-full">
        <div className="bg-white dark:bg-ios-dark-card rounded-3xl p-6 shadow-ios border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div className="flex items-center gap-5">
             {siteDetails?.logoUrl ? (
                 <img src={siteDetails.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl border border-slate-100 dark:border-slate-800 object-cover shadow-sm" />
             ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-slate-400" />
                </div>
             )}
             <div>
                <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{siteDetails?.name || 'Unknown Site'}</h2>
                    {isSiteClosed && <Badge variant="danger">CLOSED</Badge>}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{siteDetails?.address}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex-1 md:flex-none bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-4 py-2 text-center border border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Compliance</div>
                <div className={`text-lg font-bold ${complianceScore === 100 ? 'text-green-600' : 'text-orange-500'}`}>{complianceScore}%</div>
             </div>
             {!isSiteClosed && (
                <Button onClick={() => setShowAddForm(true)} icon={UserPlus} className="h-14 md:h-auto flex-1 md:flex-none">Add Staff</Button>
             )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Stats Grid - Horizontal Scroll on Mobile */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:grid md:grid-cols-4 md:mx-0 md:px-0 md:overflow-visible">
           <StatCard icon={Users} value={employees.length} title="Total Staff" color="blue" className="min-w-[140px]" />
           <StatCard icon={AlertTriangle} value={employees.filter(e => e.status === EmployeeStatus.PENDING).length} title="Pending" color="orange" className="min-w-[140px]" />
           <StatCard icon={ShieldCheck} value={employees.filter(e => e.status === EmployeeStatus.APPROVED).length} title="Active" color="green" className="min-w-[140px]" />
           <StatCard icon={ClipboardCheck} value="100%" title="Docs" color="purple" className="min-w-[140px]" />
        </div>

        <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 px-1">Staff Roster</h3>
            <EmployeeList employees={employees} />
        </div>
      </main>

      {/* Notification Toast */}
      {feedback && (
          <div className="fixed bottom-6 left-4 right-4 z-50 animate-slide-up">
            <div className={`p-4 rounded-2xl shadow-ios-float backdrop-blur-xl border flex items-center gap-3 ${feedback.type === 'success' ? 'bg-white/90 border-green-200 text-green-800' : 'bg-white/90 border-red-200 text-red-800'}`}>
                {feedback.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                <span className="font-medium text-sm flex-1">{feedback.message}</span>
            </div>
          </div>
      )}

      <NewEmployeeForm 
        isOpen={showAddForm} 
        onClose={() => setShowAddForm(false)} 
        user={user} 
        onSuccess={() => { loadData(); showNotification('success', "Employee added. Waiting for HR approval."); }}
        showNotification={showNotification}
      />
    </div>
  );
};

export default SiteDashboard;