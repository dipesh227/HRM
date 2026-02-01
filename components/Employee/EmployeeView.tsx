import React, { useState, useEffect } from 'react';
import { User, SalaryRecord, Employee, Company, Site } from '../../types';
import { dbService } from '../../services/mockDb';
import { Download, Calendar, DollarSign, Building, Loader2, Landmark, Mail, Phone, IndianRupee } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  user: User;
}

const EmployeeView: React.FC<Props> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // State for selections
  const [selectedPeriod, setSelectedPeriod] = useState<string>(''); // Format: "YYYY-MM"
  const [availablePeriods, setAvailablePeriods] = useState<{month: number, year: number}[]>([]);
  
  const [salary, setSalary] = useState<SalaryRecord | undefined>(undefined);
  const [employeeDetails, setEmployeeDetails] = useState<Employee | undefined>(undefined);
  const [companyDetails, setCompanyDetails] = useState<Company | undefined>(undefined);
  const [siteDetails, setSiteDetails] = useState<Site | undefined>(undefined);

  // Helper for Indian Currency Formatting
  const formatINR = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  };

  // Initial Fetch: Employee details & History
  useEffect(() => {
      const init = async () => {
          setLoading(true);
          const emp = await dbService.getEmployeeDetails(user.uan);
          setEmployeeDetails(emp);
          
          const history = await dbService.getEmployeeSalaryHistory(user.uan);
          setAvailablePeriods(history);
          
          // Auto-select the latest period
          if(history.length > 0) {
              const latest = history[0];
              setSelectedPeriod(`${latest.year}-${latest.month}`);
          }

          setLoading(false);
      };
      init();
  }, [user.uan]);

  // Fetch Data when period changes
  useEffect(() => {
    const fetchData = async () => {
        if(!selectedPeriod || !employeeDetails) return;
        
        const [yearStr, monthStr] = selectedPeriod.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        setLoading(true);
        const [sal, comp, site] = await Promise.all([
            dbService.getEmployeeSalary(user.uan, month, year),
            dbService.getCompanyDetails(employeeDetails.companyId),
            dbService.getSiteDetails(employeeDetails.siteId)
        ]);
        setSalary(sal);
        setCompanyDetails(comp);
        setSiteDetails(site);
        setLoading(false);
    };

    fetchData();
  }, [selectedPeriod, employeeDetails, user.uan]);

  const handleDownload = async () => {
    const element = document.getElementById('salary-slip-content');
    if(!element) return;
    
    setIsDownloading(true);

    try {
        // Small delay to ensure all content is rendered before capture
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better resolution in PDF
            logging: false,
            useCORS: true, // Enable CORS to load images from external sources
            backgroundColor: '#ffffff', // Ensure white background
            windowWidth: 1024, // Control rendering width for consistent layout
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // Add image to PDF, stretching to fit width
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`Salary_Slip_${user.uan}_${selectedPeriod}.pdf`);
    } catch (err) {
        console.error("PDF generation failed", err);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        setIsDownloading(false);
    }
  };

  if (loading && !employeeDetails) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 gap-2"><Loader2 className="animate-spin" /> Loading Profile...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Controls */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">My Pay Slips</h1>
            <p className="text-slate-500 text-sm">View and download your monthly salary statements.</p>
          </div>
          <div className="flex gap-3 items-center">
             <label className="text-sm font-medium text-slate-600">Select Period:</label>
             <select 
               value={selectedPeriod}
               onChange={(e) => setSelectedPeriod(e.target.value)}
               className="bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-w-[200px]"
             >
               {availablePeriods.length === 0 ? (
                 <option value="">No records found</option>
               ) : (
                 availablePeriods.map((p) => (
                   <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                     {new Date(0, p.month - 1).toLocaleString('default', { month: 'long' })} {p.year}
                   </option>
                 ))
               )}
             </select>
          </div>
        </div>

        {/* Salary Slip Card - Scrollable Container for Mobile */}
        {salary && employeeDetails && companyDetails && siteDetails ? (
          <div className="bg-slate-200/50 p-4 rounded-xl overflow-x-auto">
            {/* Fixed Width Container for A4 Aspect Ratio Integrity */}
            <div className="bg-white shadow-xl print:shadow-none mx-auto rounded-sm ring-1 ring-slate-900/5 min-w-[794px] w-[794px]">
                {/* ID added for html2canvas targeting */}
                <div id="salary-slip-content" className="p-12 bg-white relative flex flex-col justify-between h-full min-h-[1123px]">
                    
                    <div>
                        {/* Header / Letterhead */}
                        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                            <div className="flex gap-5 items-center">
                                <div className="h-16 w-16 flex-shrink-0 bg-slate-50 rounded p-1 border border-slate-100">
                                    <img 
                                        src={companyDetails.logoUrl} 
                                        alt="Company Logo" 
                                        crossOrigin="anonymous" 
                                        className="h-full w-full object-contain mix-blend-multiply" 
                                    />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight leading-none">{companyDetails.name}</h1>
                                    <div className="flex items-center gap-1 text-slate-600 font-medium mt-1">
                                      <Building className="w-3 h-3" />
                                      {siteDetails.name}
                                    </div>
                                    <p className="text-slate-400 text-xs max-w-xs leading-tight mt-1">{siteDetails.address}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="inline-block bg-slate-900 text-white px-4 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2">
                                    Payslip
                                </div>
                                <div className="text-slate-900 font-bold text-lg">
                                    {new Date(0, salary.month - 1).toLocaleString('default', { month: 'short' })} {salary.year}
                                </div>
                            </div>
                        </div>

                        {/* Employee Details Grid - Fixed Cols for PDF Stability */}
                        <div className="bg-slate-50 rounded border border-slate-100 p-6 mb-8">
                            <div className="grid grid-cols-4 gap-y-6 gap-x-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Employee Name</label>
                                    <div className="text-slate-900 font-bold text-sm">{employeeDetails.name}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Employee ID</label>
                                    <div className="text-slate-900 font-mono text-sm">{employeeDetails.uan}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Designation</label>
                                    <div className="text-slate-900 text-sm">{employeeDetails.role}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Date Joined</label>
                                    <div className="text-slate-900 text-sm">{employeeDetails.joinedDate}</div>
                                </div>
                                <div>
                                     <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Bank Account</label>
                                     <div className="text-slate-900 font-mono text-sm flex items-center gap-1">
                                        <Landmark className="w-3 h-3 text-slate-400" />
                                        ****8829
                                     </div>
                                </div>
                                <div>
                                     <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Status</label>
                                     <div className="text-green-600 font-bold text-[10px] uppercase border border-green-200 bg-green-50 inline-block px-2 py-0.5 rounded">{employeeDetails.status}</div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Table - Fixed 2 Cols */}
                        <div className="grid grid-cols-2 gap-0 border border-slate-200 rounded overflow-hidden mb-8">
                            
                            {/* Earnings Column */}
                            <div className="border-r border-slate-200 flex flex-col">
                                <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Earnings</h3>
                                </div>
                                <div className="flex-1 p-0 flex flex-col"> {/* Use flex-col here */}
                                    <div className="flex justify-between px-5 py-3 border-b border-slate-50 hover:bg-slate-50/50">
                                        <span className="text-slate-600 text-sm">Basic Salary</span>
                                        <span className="font-medium text-slate-900 text-sm">{formatINR(salary.basic)}</span>
                                    </div>
                                    <div className="flex justify-between px-5 py-3 border-b border-slate-50 hover:bg-slate-50/50">
                                        <span className="text-slate-600 text-sm">House Rent Allowance</span>
                                        <span className="font-medium text-slate-900 text-sm">{formatINR(salary.hra)}</span>
                                    </div>
                                    <div className="flex justify-between px-5 py-3 border-b border-slate-50 hover:bg-slate-50/50">
                                        <span className="text-slate-600 text-sm">Special Allowances</span>
                                        <span className="font-medium text-slate-900 text-sm">{formatINR(salary.allowances)}</span>
                                    </div>
                                    {/* Total Earnings Row */}
                                    <div className="flex justify-between px-5 py-3 bg-slate-50 mt-auto border-t border-slate-100"> {/* Use mt-auto */}
                                        <span className="font-bold text-slate-700 text-sm">Gross Earnings</span>
                                        <span className="font-bold text-slate-900">{formatINR(salary.basic + salary.hra + salary.allowances)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Deductions Column */}
                            <div className="flex flex-col"> {/* Use flex-col here */}
                                 <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Deductions</h3>
                                </div>
                                <div className="flex-1 p-0 flex flex-col"> {/* Use flex-col here */}
                                    <div className="flex justify-between px-5 py-3 border-b border-slate-50 hover:bg-slate-50/50">
                                        <span className="text-slate-600 text-sm">Provident Fund</span>
                                        <span className="font-medium text-red-600 text-sm">- {formatINR(salary.pfDeduction)}</span>
                                    </div>
                                    <div className="flex justify-between px-5 py-3 border-b border-slate-50 hover:bg-slate-50/50">
                                        <span className="text-slate-600 text-sm">Professional Tax</span>
                                        <span className="font-medium text-red-600 text-sm">- {formatINR(salary.taxDeduction)}</span>
                                    </div>
                                     {/* Total Deductions Row */}
                                     <div className="flex justify-between px-5 py-3 bg-slate-50 mt-auto border-t border-slate-100"> {/* Use mt-auto */}
                                        <span className="font-bold text-slate-700 text-sm">Total Deductions</span>
                                        <span className="font-bold text-red-600">{formatINR(salary.pfDeduction + salary.taxDeduction)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Net Pay */}
                        <div className="flex justify-end mb-12">
                            <div className="bg-slate-800 text-white p-6 rounded shadow-lg w-1/3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <IndianRupee className="w-16 h-16 text-white" />
                                </div>
                                <div className="text-slate-300 text-[10px] uppercase font-bold tracking-widest mb-1">Net Salary Payable</div>
                                <div className="text-3xl font-bold">{formatINR(salary.netSalary)}</div>
                                <div className="text-slate-400 text-[10px] mt-2 border-t border-slate-600 pt-2 flex justify-between">
                                    <span>Disbursed to Bank</span>
                                    <span>{new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto">
                         <div className="border-t border-slate-200 pt-6 flex justify-between items-end">
                            <div className="text-[10px] text-slate-400 space-y-1">
                                <p>• This is a system generated payslip.</p>
                                <p>• Any discrepancies must be reported to HR within 7 days.</p>
                                <p className="mt-2 text-slate-500 font-semibold text-xs">Site Contact:</p>
                                <div className="flex items-center gap-1 text-slate-500">
                                    <Mail className="w-3 h-3" /> {siteDetails.email || 'N/A'}
                                </div>
                                <div className="flex items-center gap-1 text-slate-500">
                                    <Phone className="w-3 h-3" /> {siteDetails.mobile || 'N/A'}
                                </div>
                                <p className="mt-2">Generated on: <span className="text-slate-500">{new Date().toLocaleString()}</span></p>
                            </div>
                            <div className="text-center flex-shrink-0">
                                <div className="h-12 w-32 border-b-2 border-slate-300 mb-2"></div>
                                <div className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Authorized Signatory</div>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Controls below slip */}
                <div className="bg-slate-50 p-4 text-center border-t border-slate-200">
                     <button 
                       onClick={handleDownload}
                       disabled={isDownloading}
                       className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded font-medium shadow-md transition-all text-sm"
                     >
                       {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                       {isDownloading ? 'Generating PDF...' : 'Download Official PDF'}
                     </button>
                </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
            <div className="inline-flex p-4 bg-slate-100 rounded-full text-slate-400 mb-4">
               {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Calendar className="w-8 h-8" />}
            </div>
            <h3 className="text-lg font-medium text-slate-800">
                {availablePeriods.length === 0 ? "No Pay Slips Available" : "Select a Period"}
            </h3>
            <p className="text-slate-500 mt-1">
                {availablePeriods.length === 0 
                    ? "Your salary details have not been uploaded to the system yet." 
                    : "Please select a month and year from the dropdown above to view your slip."}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmployeeView;