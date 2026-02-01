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

  // Apple-style Scrollable Navigation Pills
  const tabs = [
      { id: 'overview', label: 'Overview', icon: Activity },
      { id: 'sites', label: 'Sites', icon: Building2 },
      { id: 'approvals', label: 'Approvals', icon: CheckCircle, badge: pendingEmployees.length },
      { id: 'salary', label: 'Payroll', icon: FileSpreadsheet },
      { id: 'audit', label: 'Audit', icon: ShieldAlert },
  ];

  return (
    <div className="flex flex-col h-full bg-ios-bg dark:bg-black transition-colors duration-200">
      
      {/* Scrollable Sub-Header */}
      <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-16 z-30 pt-4 pb-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight px-1 hidden sm:block">Dashboard</h1>
            
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border
                                ${isActive 
                                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black dark:border-white shadow-md' 
                                    : 'bg-white text-slate-600 border-slate-200 dark:bg-ios-dark-card dark:text-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {tab.badge ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-black dark:bg-black dark:text-white' : 'bg-red-500 text-white'}`}>
                                    {tab.badge}
                                </span>
                            ) : null}
                        </button>
                    )
                })}
            </div>
        </div>
      </div>

      {/* Notifications Toast */}
      {feedback && (
          <div className="fixed top-24 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-slide-up">
            <div className={`p-4 rounded-2xl shadow-ios-float backdrop-blur-xl border flex items-center gap-3 ${feedback.type === 'success' ? 'bg-white/90 border-green-200 text-green-800' : 'bg-white/90 border-red-200 text-red-800'}`}>
                {feedback.type === 'success' ? <CheckIcon className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                <span className="font-medium text-sm flex-1">{feedback.message}</span>
                <button onClick={() => setFeedback(null)}><X className="w-4 h-4 opacity-50"/></button>
            </div>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <div className="animate-fade-in">
            {activeTab === 'overview' && <HRStats stats={stats} />}
            {activeTab === 'sites' && <SiteManagement sites={sites} onUpdate={loadData} showNotification={showNotification} />}
            {activeTab === 'approvals' && <PendingApprovals employees={pendingEmployees} onUpdate={loadData} showNotification={showNotification} />}
            {activeTab === 'salary' && <SalaryProcessing showNotification={showNotification} />}
            
            {activeTab === 'audit' && (
                <div className="space-y-4">
                    <h3 className="font-bold text-lg px-2">Recent Activity</h3>
                    <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {auditLogs.map(log => (
                                <div key={log.id} className="p-4 flex items-start gap-3">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-ios-blue shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{log.action}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                                        <p className="text-[10px] text-slate-400 mt-2 font-mono">{new Date(log.timestamp).toLocaleString()} • {log.actorId}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};
export default HRDashboard;