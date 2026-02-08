import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/mockDb';
import { Site, AuditLog, User, EmployeeRole } from '../../types';
import { 
  Building2, CheckCircle, FileSpreadsheet, Activity, ShieldAlert,
  AlertTriangle, CheckCircle as CheckIcon, X, Briefcase, UserCircle, Users, ChevronRight
} from 'lucide-react';

import { HRStats } from './HRStats';
import { PendingApprovals } from './PendingApprovals';
import { SiteManagement } from './SiteManagement';
import { SalaryProcessing } from './SalaryProcessing';
import { CompanyProfile } from './CompanyProfile';
import { HRProfile } from './HRProfile';
import { EmployeeDirectory } from './EmployeeDirectory';
import { MobileSidebar } from '../Layout/MobileSidebar';
import { NewEmployeeForm } from '../Site/NewEmployeeForm';
import { JobRoleManagement } from './JobRoleManagement';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'company' | 'sites' | 'approvals' | 'salary' | 'audit' | 'profile' | 'roles'>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Modal States for Sidebar Actions
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddSupervisorModal, setShowAddSupervisorModal] = useState(false);

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
      { id: 'employees', label: 'Staff Directory', icon: Users },
      { id: 'company', label: 'Company Profile', icon: Briefcase },
      { id: 'roles', label: 'Job Roles', icon: Briefcase },
      { id: 'sites', label: 'Site Management', icon: Building2 },
      { id: 'approvals', label: 'Approvals', icon: CheckCircle, badge: pendingEmployees.length },
      { id: 'salary', label: 'Payroll Processing', icon: FileSpreadsheet },
      { id: 'audit', label: 'Audit Logs', icon: ShieldAlert },
      { id: 'profile', label: 'My Profile', icon: UserCircle },
  ];

  return (
    <div className="min-h-full bg-ios-bg dark:bg-black transition-colors duration-200">
      
      {/* Mobile Sidebar (Drawer) */}
      {user && onSidebarClose && onLogout && (
          <MobileSidebar 
            isOpen={!!isSidebarOpen} 
            onClose={onSidebarClose} 
            user={user} 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={(id) => setActiveTab(id as any)}
            onLogout={onLogout}
            // HR Specific Actions
            onAddStaff={() => setShowAddStaffModal(true)}
            onAddSupervisor={() => setShowAddSupervisorModal(true)}
          />
      )}

      {/* Desktop Vertical Sidebar */}
      <aside className="hidden md:flex fixed top-16 md:top-20 bottom-0 left-0 w-64 flex-col bg-white dark:bg-ios-dark-card border-r border-slate-200 dark:border-white/5 overflow-y-auto z-30">
        <div className="p-4 space-y-1">
            <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2">Main Menu</p>
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group
                            ${isActive 
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}
                        `}
                    >
                        {/* Active Indicator Bar */}
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full"></div>}
                        
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                        <span className="flex-1 text-left">{tab.label}</span>
                        {tab.badge ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
                                {tab.badge}
                            </span>
                        ) : null}
                    </button>
                )
            })}
        </div>
        
        {/* Sidebar Footer Actions (Desktop) */}
        <div className="mt-auto p-4 border-t border-slate-100 dark:border-white/5 space-y-2">
             <button 
                onClick={() => setShowAddStaffModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-colors"
             >
                + Add Staff
             </button>
        </div>
      </aside>

      {/* Mobile Header Title - Fixed: Removed sticky positioning to prevent overlap */}
      <div className="md:hidden px-4 py-3 bg-white dark:bg-black border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Activity, { className: "w-5 h-5 text-ios-blue" })}
                {tabs.find(t => t.id === activeTab)?.label}
            </h2>
      </div>

      {/* Notifications Toast */}
      {feedback && (
          <div className="fixed top-24 md:top-8 right-4 left-4 sm:left-auto sm:w-96 z-[60] animate-slide-up">
            <div className={`p-4 rounded-3xl shadow-ios-float backdrop-blur-xl border flex items-center gap-3 ${feedback.type === 'success' ? 'bg-white/90 border-green-200 text-green-800' : 'bg-white/90 border-red-200 text-red-800'}`}>
                {feedback.type === 'success' ? <CheckIcon className="w-5 h-5 flex-shrink-0"/> : <AlertTriangle className="w-5 h-5 flex-shrink-0"/>}
                <span className="font-bold text-sm flex-1">{feedback.message}</span>
                <button onClick={() => setFeedback(null)}><X className="w-4 h-4 opacity-50"/></button>
            </div>
          </div>
      )}

      {/* Main Content Area */}
      {/* Added md:pl-64 to push content right when sidebar is visible */}
      <main className="flex-1 md:pl-64 w-full transition-all duration-300">
        <div className="p-3 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-safe">
            
            {/* Desktop Header for Content */}
            <div className="hidden md:flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {tabs.find(t => t.id === activeTab)?.label}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Manage your organization's {tabs.find(t => t.id === activeTab)?.label.toLowerCase()}
                    </p>
                </div>
            </div>

            <div className="animate-fade-in space-y-6">
                {activeTab === 'overview' && <HRStats stats={stats} />}
                {activeTab === 'employees' && <EmployeeDirectory sites={sites} showNotification={showNotification} />}
                {activeTab === 'company' && <CompanyProfile showNotification={showNotification} />}
                {activeTab === 'roles' && <JobRoleManagement showNotification={showNotification} />} 
                {activeTab === 'sites' && user && <SiteManagement sites={sites} onUpdate={loadData} showNotification={showNotification} user={user} />}
                {activeTab === 'approvals' && <PendingApprovals employees={pendingEmployees} onUpdate={loadData} showNotification={showNotification} />}
                {activeTab === 'salary' && <SalaryProcessing showNotification={showNotification} />}
                {activeTab === 'profile' && user && <HRProfile showNotification={showNotification} user={user} />}
                {activeTab === 'audit' && (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                                <h3 className="font-bold text-slate-800 dark:text-white">System Activity Logs</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {auditLogs.map(log => (
                                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${log.severity === 'CRITICAL' ? 'bg-red-500' : log.severity === 'WARN' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{log.action}</p>
                                                <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap ml-2">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{log.details}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-mono">Actor: {log.actorId}</p>
                                        </div>
                                    </div>
                                ))}
                                {auditLogs.length === 0 && (
                                    <div className="p-8 text-center text-slate-400 text-sm">No activity logs found.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>

      {/* Hidden Modals Triggered by Sidebar */}
      {user && (
          <>
            <NewEmployeeForm 
                isOpen={showAddStaffModal}
                onClose={() => setShowAddStaffModal(false)}
                user={user}
                onSuccess={() => { loadData(); showNotification('success', "Staff Added"); }}
                showNotification={showNotification}
                defaultRole={EmployeeRole.HELPER} // Pass enum val for type safety, but form will load list
                overrideSiteId={sites.length > 0 ? sites[0].id : undefined} 
                overrideCompanyId={user.companyId}
            />
             <NewEmployeeForm 
                isOpen={showAddSupervisorModal}
                onClose={() => setShowAddSupervisorModal(false)}
                user={user}
                onSuccess={() => { loadData(); showNotification('success', "Supervisor Added"); }}
                showNotification={showNotification}
                defaultRole={EmployeeRole.SUPERVISOR}
                overrideSiteId={sites.length > 0 ? sites[0].id : undefined}
                overrideCompanyId={user.companyId}
            />
          </>
      )}
    </div>
  );
};
export default HRDashboard;