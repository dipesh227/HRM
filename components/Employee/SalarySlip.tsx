import React, { useState } from 'react';
import { SalaryView, Company, Site, User } from '../../types';
import { Button } from '../UI/Button';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';
import { dbService } from '../../services/mockDb';

interface SalarySlipProps {
  user: User & { profilePhotoUrl?: string }; // Extended User interface for photo
  salary: SalaryView;
  company: Company;
  site: Site;
}

const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const numberToWords = (num: number): string => {
    const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    if ((num = num.toString().length > 9 ? parseFloat(num.toString().substring(0, 9)) : num) === 0) return 'Zero';
    
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';

    let str = '';
    str += (parseInt(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0] as any] + ' ' + a[n[1][1] as any]) + 'Crore ' : '';
    str += (parseInt(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0] as any] + ' ' + a[n[2][1] as any]) + 'Lakh ' : '';
    str += (parseInt(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0] as any] + ' ' + a[n[3][1] as any]) + 'Thousand ' : '';
    str += (parseInt(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0] as any] + ' ' + a[n[4][1] as any]) + 'Hundred ' : '';
    str += (parseInt(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0] as any] + ' ' + a[n[5][1] as any]) : '';

    return str + 'Only';
};

export const SalarySlip: React.FC<SalarySlipProps> = ({ user, salary, company, site }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [extraDetails, setExtraDetails] = useState<any>(null);

  React.useEffect(() => {
      // Fetch extra details for display (ESIC, PF)
      const fetchDetails = async () => {
          try {
              const details = await dbService.getEmployeeByUAN(user.id);
              setExtraDetails(details);
          } catch(e) { console.error(e); }
      };
      fetchDetails();
  }, [user.id]);
  
  const totalEarnings = (salary.basic || 0) + (salary.hra || 0) + (salary.allowances || 0);
  const totalDeductions = (salary.pfDeduction || 0) + (salary.taxDeduction || 0);
  const netPayable = totalEarnings - totalDeductions;
  const netPayableWords = numberToWords(Math.round(netPayable));

  const handleDownload = async () => {
    const element = document.getElementById('salary-slip-content');
    if(!element) return;
    setIsDownloading(true);
    
    // Force container full expansion for capture
    const originalStyle = element.style.cssText;
    element.style.width = '700px'; 
    element.style.height = 'auto';
    element.style.overflow = 'visible';

    try {
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for render
        const canvas = await html2canvas(element, { 
            scale: 2, 
            useCORS: true, 
            allowTaint: true,
            backgroundColor: '#ffffff',
            windowWidth: 1200, // Force large window to prevent mobile layout quirks
            height: element.scrollHeight + 50 // Ensure full height capture
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`Payslip_${user.id}_${new Date(0, salary.month-1).toLocaleString('default', {month:'short'})}_${salary.year}.pdf`);
    } catch (err) {
        console.error(err);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        element.style.cssText = originalStyle;
        setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Scroll Container */}
        <div className="overflow-x-auto pb-4 -mx-3 px-3 md:mx-0 md:px-0">
            <div className="min-w-[650px] md:w-full mx-auto bg-white shadow-2xl rounded-sm">
                <div id="salary-slip-content" className="p-8 md:p-10 text-slate-900 bg-white relative overflow-hidden">
                    
                    {/* Watermark (Fixed Visibility) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                        {company.logoUrl ? (
                             <div className="flex flex-col items-center justify-center opacity-[0.12] transform -rotate-12">
                                 <img 
                                    src={company.logoUrl} 
                                    alt="Watermark" 
                                    className="w-[450px] grayscale"
                                 />
                                 <p className="text-5xl font-black uppercase text-slate-900 mt-4 text-center max-w-lg leading-tight">
                                    {company.name}
                                 </p>
                             </div>
                        ) : (
                             <div className="transform -rotate-45 text-7xl font-black uppercase text-slate-900 opacity-[0.05] whitespace-nowrap">
                                {company.name}
                             </div>
                        )}
                    </div>

                    <div className="relative z-10">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
                            <div className="flex gap-5 items-center">
                                {company.logoUrl ? (
                                    <img src={company.logoUrl} className="h-20 w-20 object-contain" alt="Logo" />
                                ) : (
                                    <div className="h-16 w-16 bg-slate-200 flex items-center justify-center font-bold text-2xl text-slate-500 rounded">
                                        {company.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900 leading-none mb-2">{company.name}</h1>
                                    <p className="text-slate-600 text-sm max-w-sm leading-snug">{company.address || 'Corporate Office, India'}</p>
                                    <div className="flex gap-3 text-xs text-slate-500 mt-2">
                                        {company.email && <span>{company.email}</span>}
                                        {company.mobile && <span>| {company.mobile}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-black text-slate-200 tracking-tighter uppercase">Payslip</h2>
                                <p className="text-slate-900 font-bold text-lg mt-1">{new Date(0, salary.month-1).toLocaleString('default',{month:'long'})} {salary.year}</p>
                            </div>
                        </div>

                        {/* Employee Details Grid */}
                        <div className="grid grid-cols-2 gap-8 mb-8 relative">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Employee Details</h3>
                                <div className="space-y-1">
                                    <div className="flex"><span className="w-24 text-sm text-slate-500">Name:</span><span className="text-sm font-bold text-slate-900">{user.name}</span></div>
                                    <div className="flex"><span className="w-24 text-sm text-slate-500">UAN:</span><span className="text-sm font-mono text-slate-900">{user.id}</span></div>
                                    <div className="flex"><span className="w-24 text-sm text-slate-500">Role:</span><span className="text-sm font-medium text-slate-900">{user.role}</span></div>
                                    {extraDetails?.bankAccountNo && (
                                        <div className="flex"><span className="w-24 text-sm text-slate-500">Bank A/c:</span><span className="text-sm font-mono text-slate-900">*******{extraDetails.bankAccountNo.slice(-4)}</span></div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Photo */}
                            {user.profilePhotoUrl && (
                                <div className="absolute right-0 top-0 h-28 w-24 bg-white border border-slate-200 p-1 shadow-sm">
                                    <img src={user.profilePhotoUrl} alt="Employee" className="w-full h-full object-cover" />
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Compliance & Site</h3>
                                <div className="space-y-1">
                                    <div className="flex"><span className="w-24 text-sm text-slate-500">Site:</span><span className="text-sm font-bold text-slate-900">{site.name}</span></div>
                                    <div className="flex"><span className="w-24 text-sm text-slate-500">PF No:</span><span className="text-sm font-mono text-slate-900">{extraDetails?.pfNo || 'N/A'}</span></div>
                                    <div className="flex"><span className="w-24 text-sm text-slate-500">ESIC No:</span><span className="text-sm font-mono text-slate-900">{extraDetails?.esicNo || 'N/A'}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Salary Table (Transparent rows for watermark) */}
                        <div className="border border-slate-300 mb-8">
                            {/* Table Header */}
                            <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-300">
                                <div className="grid grid-cols-2">
                                    <div className="px-4 py-2 text-xs font-bold uppercase text-slate-600 border-r border-slate-300">Earnings</div>
                                    <div className="px-4 py-2 text-xs font-bold uppercase text-slate-600 text-right border-r border-slate-300">Amount</div>
                                </div>
                                <div className="grid grid-cols-2">
                                    <div className="px-4 py-2 text-xs font-bold uppercase text-slate-600 border-r border-slate-300">Deductions</div>
                                    <div className="px-4 py-2 text-xs font-bold uppercase text-slate-600 text-right">Amount</div>
                                </div>
                            </div>

                            {/* Table Body - Using bg-transparent/white mix to fix watermark issue */}
                            <div className="grid grid-cols-2 h-48 bg-white/40 backdrop-blur-[1px]">
                                {/* Earnings Column */}
                                <div className="border-r border-slate-300 p-0 relative">
                                    <div className="grid grid-cols-2 border-b border-slate-100/50 px-4 py-2">
                                        <span className="text-sm text-slate-700">Basic Salary</span>
                                        <span className="text-sm font-medium text-right">{formatINR(salary.basic)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 border-b border-slate-100/50 px-4 py-2">
                                        <span className="text-sm text-slate-700">House Rent Allowance</span>
                                        <span className="text-sm font-medium text-right">{formatINR(salary.hra)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 border-b border-slate-100/50 px-4 py-2">
                                        <span className="text-sm text-slate-700">Special Allowances</span>
                                        <span className="text-sm font-medium text-right">{formatINR(salary.allowances)}</span>
                                    </div>
                                    
                                    <div className="absolute bottom-0 left-0 right-0 bg-slate-50/80 border-t border-slate-300 px-4 py-2 grid grid-cols-2">
                                        <span className="text-sm font-bold text-slate-800">Total Earnings</span>
                                        <span className="text-sm font-bold text-right text-slate-800">{formatINR(totalEarnings)}</span>
                                    </div>
                                </div>

                                {/* Deductions Column */}
                                <div className="p-0 relative">
                                    <div className="grid grid-cols-2 border-b border-slate-100/50 px-4 py-2">
                                        <span className="text-sm text-slate-700">Provident Fund (PF)</span>
                                        <span className="text-sm font-medium text-right text-red-600">{formatINR(salary.pfDeduction)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 border-b border-slate-100/50 px-4 py-2">
                                        <span className="text-sm text-slate-700">Prof. Tax / ESIC</span>
                                        <span className="text-sm font-medium text-right text-red-600">{formatINR(salary.taxDeduction)}</span>
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 bg-slate-50/80 border-t border-slate-300 px-4 py-2 grid grid-cols-2">
                                        <span className="text-sm font-bold text-slate-800">Total Deductions</span>
                                        <span className="text-sm font-bold text-right text-red-600">{formatINR(totalDeductions)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Net Pay Section */}
                        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-t-2 border-slate-900 pt-6">
                            <div className="text-left w-full">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Pay in Words</p>
                                <p className="text-sm font-bold text-slate-800 italic bg-slate-100/80 p-2 rounded border border-slate-200">
                                    {netPayableWords} Rupees
                                </p>
                            </div>
                            <div className="flex flex-col items-end min-w-[200px]">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Net Payable</span>
                                <span className="text-3xl font-black text-slate-900 bg-yellow-300 px-3 py-1 -rotate-1 shadow-sm">
                                    {formatINR(netPayable)}
                                </span>
                            </div>
                        </div>

                        {/* Middle Stamp Section */}
                        <div className="mt-8 ml-12 h-36 relative">
                            {company.stampUrl && (
                                <div className="absolute top-2 left-0 transform -rotate-6">
                                    <img 
                                        src={company.stampUrl} 
                                        alt="Official Stamp" 
                                        className="h-36 w-36 object-contain opacity-90 mix-blend-multiply" 
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-4 pt-6 border-t border-dashed border-slate-300 flex justify-between items-end relative">
                            <div className="text-xs text-slate-400">
                                <p className="font-bold">Computer Generated Report</p>
                                <p>Date: {new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <div className="relative h-20 w-40 mb-2">
                                    {company.stampUrl && (
                                        <img 
                                            src={company.stampUrl} 
                                            alt="Stamp" 
                                            className="absolute right-0 bottom-[-10px] h-28 w-28 opacity-40 object-contain rotate-[-12deg]" 
                                        />
                                    )}
                                    {company.signatureUrl && (
                                        <img 
                                            src={company.signatureUrl} 
                                            alt="Authorized Signature" 
                                            className="absolute right-0 bottom-2 h-16 w-36 object-contain z-10" 
                                        />
                                    )}
                                </div>
                                <div className="h-0 w-40 border-b border-slate-300 mb-1"></div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Authorized Signatory</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-center">
            <Button onClick={handleDownload} isLoading={isDownloading} variant="primary" icon={Download} className="shadow-xl px-8">
                {isDownloading ? 'Processing...' : 'Download PDF'}
            </Button>
        </div>
    </div>
  );
};