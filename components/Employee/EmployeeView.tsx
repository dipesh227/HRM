import React, { useState, useEffect } from 'react';
import { User, SalaryView, Company, Site } from '../../types';
import { dbService } from '../../services/mockDb';
import { Loader2 } from 'lucide-react';
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
    <div className="min-h-full bg-slate-100 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Controls */}
        <Card className="flex justify-between items-center p-6">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">My Payslips (UAN: {user.id})</h1>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
             {availablePeriods.map(p => <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>{p.month}/{p.year}</option>)}
          </select>
        </Card>

        {salary && companyDetails && siteDetails ? (
            <SalarySlip user={user} salary={salary} company={companyDetails} site={siteDetails} />
        ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Select a period to view payslip.</div>
        )}
      </div>
    </div>
  );
};
export default EmployeeView;