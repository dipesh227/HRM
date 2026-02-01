import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/mockDb';
import { Site, AuditLog } from '../../types';
import { 
  Building2, CheckCircle, FileSpreadsheet, Activity, ShieldAlert,
  AlertTriangle, CheckCircle as CheckIcon, X
} from 'lucide-react';

// Sub-components
import { HRStats } from './HRStats';
import { PendingApprovals } from './PendingApprovals';
import { SiteManagement } from './SiteManagement';
import { SalaryProcessing } from './SalaryProcessing';

const HRDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [sites, setSites] = useState<Site[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sites' | 'approvals' | 'salary' | 'audit'>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
      showNotification('error', "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Nav Button Component
  const NavBtn = ({ id, label, icon: Icon, badge }: any) => (
    <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === id ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-blue-600 dark:shadow-blue-900/20' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}>
      <Icon className="w-4 h-4" /> <span>{label}</span>
      {badge > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">{badge}</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 sticky top-0 z-20 shadow-sm/50 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">HR Console</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage sites, payroll, and approvals</p>
              </div>
              <div className="flex flex-wrap gap-2">
                 <NavBtn id="overview" label="Overview" icon={Activity} />
                 <NavBtn id="sites" label="Sites" icon={Building2} />
                 <NavBtn id="approvals" label="Approvals" icon={CheckCircle} badge={pendingEmployees.length} />
                 <NavBtn id="salary" label="Payroll" icon={FileSpreadsheet} />
                 <NavBtn id="audit" label="Audit" icon={ShieldAlert} />
              </div>
          </div>
      </header>

      {/* Notifications */}
      {feedback && (
          <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in-up backdrop-blur-md ${feedback.type === 'success' ? 'bg-white/90 dark:bg-slate-800/90 border-green-500/50 text-slate-800 dark:text-white' : 'bg-white/90 dark:bg-slate-800/90 border-red-500/50 text-slate-800 dark:text-white'}`}>
              <div className={`p-1 rounded-full ${feedback.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {feedback.type === 'success' ? <CheckIcon className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
              </div>
              <span className="font-medium text-sm pr-4">{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="ml-auto hover:bg-black/5 rounded-full p-1"><X className="w-4 h-4 text-slate-400"/></button>
          </div>
      )}

      <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {activeTab === 'overview' && <HRStats stats={stats} />}
        {activeTab === 'sites' && <SiteManagement sites={sites} onUpdate={loadData} showNotification={showNotification} />}
        {activeTab === 'approvals' && <PendingApprovals employees={pendingEmployees} onUpdate={loadData} showNotification={showNotification} />}
        {activeTab === 'salary' && <SalaryProcessing showNotification={showNotification} />}
        
        {activeTab === 'audit' && (
            <div className="space-y-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 font-semibold text-slate-700 dark:text-slate-200">
                    System Audit Logs
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                    {auditLogs.map(log => (
                        <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-center text-sm">
                            <div className="flex items-center gap-4">
                                <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-200 block">{log.action}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-xs">{log.details}</span>
                                </div>
                            </div>
                            <span className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded font-medium">{log.actorId}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>
    </div>
  );
};
export default HRDashboard;