import React, { useState, useEffect } from 'react';
import { User, SalaryView, Employee, Company, Site } from '../../types';
import { dbService } from '../../services/mockDb';
import { Download, Calendar, Building, Loader2, Landmark, Mail, Phone, IndianRupee } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  user: User;
}

const EmployeeView: React.FC<Props> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<{month: number, year: number}[]>([]);
  
  const [salary, setSalary] = useState<SalaryView | undefined>(undefined);
  const [companyDetails, setCompanyDetails] = useState<Company | undefined>(undefined);
  const [siteDetails, setSiteDetails] = useState<Site | undefined>(undefined);
  
  // Format INR
  const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  useEffect(() => {
      const init = async () => {
          setLoading(true);
          const history = await dbService.getEmployeeSalaryHistory(user.id); // user.id is UAN for Staff
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
        
        // Fetch VIEW data which includes computed netSalary
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

  const handleDownload = async () => {
    const element = document.getElementById('salary-slip-content');
    if(!element) return;
    setIsDownloading(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1024 });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`Payslip_${user.id}_${selectedPeriod}.pdf`);
    } catch (err) {
        alert("Download failed.");
    } finally {
        setIsDownloading(false);
    }
  };

  if (loading && !salary) return <div className="h-full flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400"><Loader2 className="animate-spin"/> Loading...</div>;

  return (
    <div className="min-h-full bg-slate-100 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">My Payslips (UAN: {user.id})</h1>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
             {availablePeriods.map(p => <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>{p.month}/{p.year}</option>)}
          </select>
        </div>

        {/* Slip Render */}
        {salary && companyDetails && siteDetails ? (
            <div className="bg-slate-200/50 dark:bg-slate-900/50 p-4 rounded-xl overflow-x-auto">
                {/* Note: The Salary Slip itself usually remains white/light paper style even in dark mode for PDF generation consistency */}
                <div className="bg-white shadow-xl mx-auto min-w-[794px] w-[794px]">
                    <div id="salary-slip-content" className="p-12 bg-white min-h-[1123px] flex flex-col justify-between text-slate-900">
                        <div>
                             {/* Header */}
                             <div className="flex justify-between border-b-2 border-slate-800 pb-6 mb-8">
                                <div className="flex gap-4">
                                    <img src={companyDetails.logoUrl} className="h-16 w-16 object-contain" crossOrigin="anonymous" />
                                    <div>
                                        <h1 className="text-2xl font-bold uppercase text-slate-900">{companyDetails.name}</h1>
                                        <p className="text-slate-500 text-sm">{siteDetails.name}, {siteDetails.city}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="bg-slate-900 text-white px-4 py-1 text-xs font-bold uppercase mb-2 inline-block">Payslip</div>
                                    <div className="text-lg font-bold text-slate-900">{salary.month}/{salary.year}</div>
                                </div>
                             </div>

                             {/* Employee Details */}
                             <div className="bg-slate-50 p-6 rounded border border-slate-100 mb-8 grid grid-cols-3 gap-4">
                                 <div><label className="text-[10px] uppercase font-bold text-slate-400">Name</label><div className="font-bold text-slate-900">{user.name}</div></div>
                                 <div><label className="text-[10px] uppercase font-bold text-slate-400">UAN</label><div className="font-mono text-slate-900">{user.id}</div></div>
                                 <div><label className="text-[10px] uppercase font-bold text-slate-400">Designation</label><div className="text-slate-900">{user.role}</div></div>
                             </div>

                             {/* Financials */}
                             <div className="grid grid-cols-2 border border-slate-200 rounded mb-8">
                                 <div className="border-r border-slate-200">
                                     <div className="bg-slate-100 px-4 py-2 text-xs font-bold uppercase text-slate-700">Earnings</div>
                                     <div className="p-4 space-y-2">
                                         <div className="flex justify-between text-sm text-slate-700"><span>Basic</span><span>{formatINR(salary.basic)}</span></div>
                                         <div className="flex justify-between text-sm text-slate-700"><span>HRA</span><span>{formatINR(salary.hra)}</span></div>
                                         <div className="flex justify-between text-sm text-slate-700"><span>Allowances</span><span>{formatINR(salary.allowances)}</span></div>
                                     </div>
                                 </div>
                                 <div>
                                     <div className="bg-slate-100 px-4 py-2 text-xs font-bold uppercase text-slate-700">Deductions</div>
                                     <div className="p-4 space-y-2">
                                         <div className="flex justify-between text-sm text-red-600"><span>PF</span><span>-{formatINR(salary.pfDeduction)}</span></div>
                                         <div className="flex justify-between text-sm text-red-600"><span>Tax</span><span>-{formatINR(salary.taxDeduction)}</span></div>
                                     </div>
                                 </div>
                             </div>

                             {/* Net Pay */}
                             <div className="flex justify-end">
                                 <div className="bg-slate-800 text-white p-6 rounded w-1/3 text-right shadow-lg">
                                     <div className="text-[10px] uppercase opacity-75">Net Payable</div>
                                     <div className="text-3xl font-bold">{formatINR(salary.netSalary)}</div>
                                 </div>
                             </div>
                        </div>
                        
                        <div className="text-center text-[10px] text-slate-400 pt-6 border-t border-slate-200 mt-8">System Generated Document</div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                        <button onClick={handleDownload} disabled={isDownloading} className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700">
                            {isDownloading ? 'Processing...' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Select a period to view payslip.</div>
        )}
      </div>
    </div>
  );
};
export default EmployeeView;