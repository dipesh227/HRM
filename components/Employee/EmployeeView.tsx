import React, { useState, useEffect } from 'react';
import { User, SalaryView, Company, Site, Employee } from '../../types';
import { dbService } from '../../services/mockDb';
import { Loader2, Calendar, FileText, UserCircle, Activity } from 'lucide-react';
import { SalarySlip } from './SalarySlip';
import { Card } from '../UI/Card';
import { MobileSidebar } from '../Layout/MobileSidebar';
import { StaffProfile } from '../Common/StaffProfile';

interface Props {
  user: User;
  isSidebarOpen?: boolean;
  onSidebarClose?: () => void;
  onLogout?: () => void;
}

const EmployeeView: React.FC<Props> = ({ user, isSidebarOpen, onSidebarClose, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payslips' | 'profile'>('payslips');
  
  // Payslip State
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<{month: number, year: number}[]>([]);
  const [salary, setSalary] = useState<SalaryView | undefined>(undefined);
  const [companyDetails, setCompanyDetails] = useState<Company | undefined>(undefined);
  const [siteDetails, setSiteDetails] = useState<Site | undefined>(undefined);
  
  // Extended user details with photo
  const [employeeDetails, setEmployeeDetails] = useState<Employee | undefined>(undefined);

  // Mobile Header Title logic
  const tabs = [
      { id: 'payslips', label: 'My Payslips', icon: FileText },
      { id: 'profile', label: 'My Profile', icon: UserCircle },
  ];

  useEffect(() => {
      const init = async () => {
          setLoading(true);
          // Fetch history
          const history = await dbService.getEmployeeSalaryHistory(user.id);
          setAvailablePeriods(history);
          if(history.length > 0) setSelectedPeriod(`${history[0].year}-${history[0].month}`);
          
          // Fetch full employee details (for photo)
          try {
              const emp = await dbService.getEmployeeByUAN(user.id);
              setEmployeeDetails(emp);
          } catch(e) { console.error("Failed to load employee details", e); }

          setLoading(false);
      };
      init();
  }, [user.id]);

  useEffect(() => {
    const fetchData = async () => {
        if(!selectedPeriod) return;
        setLoading(true);
        const [year, month] = selectedPeriod.split('-').map(Number);
        
        const sal = await dbService.getEmployeeSalaryView(user.id, month, year);
        setSalary(sal);
        
        if (user.companyId) {
             const comp = await dbService.getCompanyDetails(user.companyId);
             setCompanyDetails(comp);
        }
        if (user.siteId) {
             const site = await dbService.getSiteDetails(user.siteId);
             setSiteDetails(site);
        }
        setLoading(false);
    };
    fetchData();
  }, [selectedPeriod, user.id, user.companyId, user.siteId]);

  return (
    <div className="flex flex-col min-h-full bg-slate-100 dark:bg-black transition-colors duration-200">
      
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
          />
      )}

       {/* Mobile Header Title */}
       <div className="md:hidden px-4 py-3 bg-white/90 dark:bg-black/80 backdrop-blur border-b border-slate-100 dark:border-white/10 sticky top-16 z-30 flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Activity, { className: "w-5 h-5 text-ios-blue" })}
                {tabs.find(t => t.id === activeTab)?.label}
            </h2>
      </div>

      <div className="flex-1 p-3 md:p-8 max-w-4xl mx-auto w-full pb-safe">
        
        {/* Profile Tab */}
        {activeTab === 'profile' && (
             <StaffProfile user={user} />
        )}

        {/* Payslips Tab */}
        {activeTab === 'payslips' && (
            <div className="space-y-4 animate-fade-in">
                {/* Controls */}
                <Card className="flex flex-col sm:flex-row justify-between items-center p-4 gap-4 sticky top-4 md:static z-20 shadow-lg border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-none">Payslip Viewer</h1>
                            <p className="text-xs text-slate-500 mt-1">UAN: <span className="font-mono">{user.id}</span></p>
                        </div>
                    </div>
                    
                    <div className="relative w-full sm:w-auto">
                        <select 
                            value={selectedPeriod} 
                            onChange={(e) => setSelectedPeriod(e.target.value)} 
                            className="w-full sm:w-48 appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white py-2.5 pl-4 pr-10 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                            {availablePeriods.length === 0 && <option value="">No records found</option>}
                            {availablePeriods.map(p => <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>{new Date(0, p.month-1).toLocaleString('default', {month:'long'})} {p.year}</option>)}
                        </select>
                        <div className="absolute right-3 top-3.5 w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 pointer-events-none"></div>
                    </div>
                </Card>

                {loading ? (
                    <div className="h-64 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="animate-spin"/> Loading Payslip...</div>
                ) : salary && companyDetails && siteDetails ? (
                    <div className="pb-12">
                        <SalarySlip 
                            user={{ ...user, profilePhotoUrl: employeeDetails?.profilePhotoUrl }} 
                            salary={salary} 
                            company={companyDetails} 
                            site={siteDetails} 
                        />
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
                        <p className="text-slate-400 font-medium">No payslip data available for the selected period.</p>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};
export default EmployeeView;