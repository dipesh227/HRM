import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/mockDb';
import { Site, AuditLog, User } from '../../types';
import { 
  Building2, CheckCircle, FileSpreadsheet, Activity, ShieldAlert,
  AlertTriangle, CheckCircle as CheckIcon, X, Briefcase, UserCircle
} from 'lucide-react';

import { HRStats } from './HRStats';
import { PendingApprovals } from './PendingApprovals';
import { SiteManagement } from './SiteManagement';
import { SalaryProcessing } from './SalaryProcessing';
import { CompanyProfile } from './CompanyProfile';
import { HRProfile } from './HRProfile';
import { MobileSidebar } from '../Layout/MobileSidebar';

interface HRDashboardProps {
    user?: User;
    isSidebarOpen?: boolean;
    onSidebarClose?: () => void;
    onLogout?: () => void;
}

const HRDashboard: React.FC<HRDashboardProps> = ({ user, isSidebarOpen, onSidebarClose, onLogout }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [sites, setSites] = useState<Site[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'company' | 'sites' | 'approvals' | 'salary' | 'audit' | 'profile'>('overview');
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

  const tabs = [
      { id: 'overview', label: 'Overview', icon: Activity },
      { id: 'company', label: 'Company', icon: Briefcase },
      { id: 'sites', label: 'Sites', icon: Building2 },
      { id: 'approvals', label: 'Approvals', icon: CheckCircle, badge: pendingEmployees.length },
      { id: 'salary', label: 'Payroll', icon: FileSpreadsheet },
      { id: 'audit', label: 'Audit', icon: ShieldAlert },
      { id: 'profile', label: 'Profile', icon: UserCircle },
  ];

  return (
    <div className="flex flex-col min-h-full bg-ios-bg dark:bg-black transition-colors duration-200">
      
      {/* Mobile Sidebar */}
      {user && onSidebarClose && onLogout && (
          <MobileSidebar 
            isOpen={!!isSidebarOpen} 
            onClose={onSidebarClose} 
            user={user} 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={(id) => setActiveTab(id as any)}
            onLogout={onLogout}
            // HR typically adds users via Site Management, but if global add is needed:
            // onAddEmployee={() => { setActiveTab('sites'); /* Logic to open modal in site mgmt */ }}
          />
      )}

      {/* Desktop Tabs / Mobile Horizontal Scroll (Hidden if we only want sidebar, but usually good to keep for quick access) */}
      <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/10 sticky top-16 md:top-20 z-40 pt-3 pb-3 px-4 sm:px-6 lg:px-8 transition-all duration-300 hidden md:block">
        <div className="max-w-7xl mx-auto">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-3 md:mb-4 tracking-tight px-1 hidden sm:block">Dashboard Overview</h1>
            
            <div className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth snap-x touch-pan-x">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex-shrink-0 snap-start flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all duration-300 border
                                ${isActive 
                                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black dark:border-white shadow-md transform scale-100' 
                                    : 'bg-white text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'}
                            `}
                        >
                            <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? 'text-white dark:text-black' : 'text-slate-400'}`} />
                            {tab.label}
                            {tab.badge ? (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-black dark:bg-black dark:text-white' : 'bg-red-500 text-white'}`}>
                                    {tab.badge}
                                </span>
                            ) : null}
                        </button>
                    )
                })}
            </div>
        </div>
      </div>

      {/* Mobile Header Title (Replaces tabs on mobile since they are in sidebar now) */}
      <div className="md:hidden px-4 py-3 bg-white/90 dark:bg-black/80 backdrop-blur border-b border-slate-100 dark:border-white/10 sticky top-16 z-30 flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Activity, { className: "w-5 h-5 text-ios-blue" })}
                {tabs.find(t => t.id === activeTab)?.label}
            </h2>
      </div>

      {/* Notifications Toast */}
      {feedback && (
          <div className="fixed top-24 md:top-28 right-4 left-4 sm:left-auto sm:w-96 z-[60] animate-slide-up">
            <div className={`p-4 rounded-3xl shadow-ios-float backdrop-blur-xl border flex items-center gap-3 ${feedback.type === 'success' ? 'bg-white/90 border-green-200 text-green-800' : 'bg-white/90 border-red-200 text-red-800'}`}>
                {feedback.type === 'success' ? <CheckIcon className="w-5 h-5 flex-shrink-0"/> : <AlertTriangle className="w-5 h-5 flex-shrink-0"/>}
                <span className="font-bold text-sm flex-1">{feedback.message}</span>
                <button onClick={() => setFeedback(null)}><X className="w-4 h-4 opacity-50"/></button>
            </div>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-safe">
        <div className="animate-fade-in space-y-6 md:space-y-8">
            {activeTab === 'overview' && <HRStats stats={stats} />}
            {activeTab === 'company' && <CompanyProfile showNotification={showNotification} />}
            {activeTab === 'sites' && user && <SiteManagement sites={sites} onUpdate={loadData} showNotification={showNotification} user={user} />}
            {activeTab === 'approvals' && <PendingApprovals employees={pendingEmployees} onUpdate={loadData} showNotification={showNotification} />}
            {activeTab === 'salary' && <SalaryProcessing showNotification={showNotification} />}
            {activeTab === 'profile' && user && <HRProfile showNotification={showNotification} user={user} />}
            {activeTab === 'audit' && (
                <div className="space-y-4">
                    <h3 className="font-bold text-lg px-2">Recent Activity</h3>
                    <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {auditLogs.map(log => (
                                <div key={log.id} className="p-4 flex items-start gap-3">
                                    <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{log.action}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{log.details}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </p>
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