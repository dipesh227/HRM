import React, { useState, useEffect } from 'react';
import { User, Employee, SiteStatus, EmployeeStatus, Site } from '../../types';
import { dbService } from '../../services/mockDb';
import { Users, UserPlus, AlertTriangle, ShieldCheck, ClipboardCheck, Loader2, CheckCircle, X } from 'lucide-react';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative transition-colors duration-200">
      
      {/* Toast Notification Banner */}
      {feedback && (
          <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-xl border-l-4 animate-fade-in-up flex items-center gap-3 ${feedback.type === 'success' ? 'bg-white dark:bg-slate-800 border-green-500 text-slate-800 dark:text-white' : 'bg-white dark:bg-slate-800 border-red-500 text-slate-800 dark:text-white'}`}>
              {feedback.type === 'success' ? <CheckCircle className="text-green-500 w-5 h-5" /> : <AlertTriangle className="text-red-500 w-5 h-5" />}
              <span className="font-medium text-sm">{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="ml-2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
      )}

      {/* Site Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 md:px-8 md:py-6 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
             {siteDetails?.logoUrl && (
                 <img src={siteDetails.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg border border-slate-100 dark:border-slate-800 object-cover" />
             )}
             <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{siteDetails?.name || 'Unknown Site'}</h2>
                    <Badge variant={complianceScore === 100 ? 'success' : 'warning'}>{complianceScore}% Compliance</Badge>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2 mt-1">
                    {siteDetails?.address}
                    {isSiteClosed && <Badge variant="danger">SITE CLOSED</Badge>}
                </p>
             </div>
          </div>
          {!isSiteClosed && (
            <Button onClick={() => setShowAddForm(true)} icon={UserPlus}>Add Employee</Button>
          )}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
           <StatCard icon={Users} count={employees.length} label="Total Staff" color="blue" />
           <StatCard icon={AlertTriangle} count={employees.filter(e => e.status === EmployeeStatus.PENDING).length} label="Pending" color="orange" />
           <StatCard icon={ShieldCheck} count={employees.filter(e => e.status === EmployeeStatus.APPROVED).length} label="Active" color="green" />
           <StatCard icon={ClipboardCheck} count="100%" label="Docs" color="purple" />
        </div>

        <EmployeeList employees={employees} />
      </main>

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

const StatCard = ({ icon: Icon, count, label, color }: any) => {
    const colorClasses: any = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    };
    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start gap-2">
            <div className={`p-2 rounded-full ${colorClasses[color]}`}><Icon className="w-5 h-5" /></div>
            <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{count}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">{label}</div>
            </div>
        </div>
    );
};

export default SiteDashboard;