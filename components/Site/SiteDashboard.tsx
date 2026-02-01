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

  if (loading && !siteDetails) return <div className="h-full flex items-center justify-center gap-3 text-slate-500 font-medium"><Loader2 className="animate-spin w-6 h-6" /> Loading Site Data...</div>;

  return (
    <div className="flex flex-col h-full bg-ios-bg dark:bg-black relative transition-colors duration-200">
      
      {/* Site Header Card */}
      <div className="px-4 py-6 md:py-8 max-w-7xl mx-auto w-full">
        <div className="bg-white dark:bg-ios-dark-card rounded-[2rem] p-6 md:p-8 shadow-ios dark:shadow-none border border-white/50 dark:border-white/5 flex flex-col lg:flex-row justify-between lg:items-center gap-8">
          
          {/* Info Section */}
          <div className="flex items-start gap-6">
             {siteDetails?.logoUrl ? (
                 <img src={siteDetails.logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl border border-slate-100 dark:border-white/10 object-cover shadow-sm bg-white dark:bg-white/5" />
             ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center border border-white/20">
                    <Building2 className="w-8 h-8 text-slate-400" />
                </div>
             )}
             <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{siteDetails?.name || 'Unknown Site'}</h2>
                    {isSiteClosed && <Badge variant="danger" className="self-start">CLOSED</Badge>}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed font-medium">{siteDetails?.address}</p>
                <div className="mt-3 flex gap-2">
                    <Badge variant="neutral" className="text-[10px] tracking-wider uppercase">{siteDetails?.city}</Badge>
                    <Badge variant="neutral" className="text-[10px] tracking-wider uppercase">{siteDetails?.state}</Badge>
                </div>
             </div>
          </div>
          
          {/* Actions Section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto bg-slate-50 dark:bg-black/20 p-2 rounded-3xl border border-slate-100 dark:border-white/5">
             <div className="flex-1 sm:flex-none flex items-center justify-between sm:justify-center gap-4 px-6 py-3 rounded-2xl bg-white dark:bg-white/5 shadow-sm border border-slate-100 dark:border-white/5">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Compliance</div>
                <div className={`text-2xl font-bold ${complianceScore === 100 ? 'text-green-500' : 'text-orange-500'}`}>{complianceScore}%</div>
             </div>
             {!isSiteClosed && (
                <Button onClick={() => setShowAddForm(true)} icon={UserPlus} className="h-full flex-1 sm:flex-none shadow-glow">Add Staff</Button>
             )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-12 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Stats Grid - Horizontal Scroll on Mobile with Snap */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 snap-x md:grid md:grid-cols-4 md:mx-0 md:px-0 md:overflow-visible md:pb-0">
           <div className="snap-start min-w-[160px] md:min-w-0">
              <StatCard icon={Users} value={employees.length} title="Total Staff" color="blue" />
           </div>
           <div className="snap-start min-w-[160px] md:min-w-0">
              <StatCard icon={AlertTriangle} value={employees.filter(e => e.status === EmployeeStatus.PENDING).length} title="Pending" color="orange" />
           </div>
           <div className="snap-start min-w-[160px] md:min-w-0">
              <StatCard icon={ShieldCheck} value={employees.filter(e => e.status === EmployeeStatus.APPROVED).length} title="Active" color="green" />
           </div>
           <div className="snap-start min-w-[160px] md:min-w-0">
              <StatCard icon={ClipboardCheck} value="100%" title="Docs" color="purple" />
           </div>
        </div>

        <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white px-2">Staff Roster</h3>
            <EmployeeList employees={employees} />
        </div>
      </main>

      {/* Notification Toast */}
      {feedback && (
          <div className="fixed bottom-8 left-4 right-4 sm:left-auto sm:right-8 sm:w-96 z-50 animate-slide-up">
            <div className={`p-4 rounded-3xl shadow-ios-float backdrop-blur-xl border flex items-center gap-3 ${feedback.type === 'success' ? 'bg-white/90 border-green-200 text-green-800' : 'bg-white/90 border-red-200 text-red-800'}`}>
                {feedback.type === 'success' ? <CheckCircle className="w-6 h-6 flex-shrink-0"/> : <AlertTriangle className="w-6 h-6 flex-shrink-0"/>}
                <span className="font-bold text-sm flex-1">{feedback.message}</span>
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