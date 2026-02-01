import React, { useState, useEffect } from 'react';
import { User, SalaryView, Company, Site } from '../../types';
import { dbService } from '../../services/mockDb';
import { Loader2, Calendar } from 'lucide-react';
import { SalarySlip } from './SalarySlip';
import { Card } from '../UI/Card';

interface Props {
  user: User;
}

const EmployeeView: React.FC<Props> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<{month: number, year: number}[]>([]);
  
  const [salary, setSalary] = useState<SalaryView | undefined>(undefined);
  const [companyDetails, setCompanyDetails] = useState<Company | undefined>(undefined);
  const [siteDetails, setSiteDetails] = useState<Site | undefined>(undefined);

  useEffect(() => {
      const init = async () => {
          setLoading(true);
          const history = await dbService.getEmployeeSalaryHistory(user.id);
          setAvailablePeriods(history);
          if(history.length > 0) setSelectedPeriod(`${history[0].year}-${history[0].month}`);
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

  if (loading && !salary) return <div className="h-full flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400"><Loader2 className="animate-spin"/> Loading...</div>;

  return (
    <div className="min-h-full bg-slate-100 dark:bg-black p-3 md:p-8 transition-colors duration-200 pb-safe">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Controls */}
        <Card className="flex flex-col sm:flex-row justify-between items-center p-4 gap-4 sticky top-4 z-30 shadow-lg border-blue-100 dark:border-blue-900/30">
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
                 {availablePeriods.map(p => <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>{new Date(0, p.month-1).toLocaleString('default', {month:'long'})} {p.year}</option>)}
              </select>
              <div className="absolute right-3 top-3.5 w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 pointer-events-none"></div>
          </div>
        </Card>

        {salary && companyDetails && siteDetails ? (
            <div className="pb-12">
                <SalarySlip user={user} salary={salary} company={companyDetails} site={siteDetails} />
            </div>
        ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
                <p className="text-slate-400 font-medium">No payslip data for selected period.</p>
            </div>
        )}
      </div>
    </div>
  );
};
export default EmployeeView;