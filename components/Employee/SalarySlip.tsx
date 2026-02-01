import React, { useState } from 'react';
import { SalaryView, Company, Site, User } from '../../types';
import { Button } from '../UI/Button';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';

interface SalarySlipProps {
  user: User;
  salary: SalaryView;
  company: Company;
  site: Site;
}

const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const SalarySlip: React.FC<SalarySlipProps> = ({ user, salary, company, site }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownload = async () => {
    const element = document.getElementById('salary-slip-content');
    if(!element) return;
    setIsDownloading(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for render
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1024 });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`Payslip_${user.id}_${salary.year}-${salary.month}.pdf`);
    } catch (err) {
        alert("Download failed.");
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Scroll Container - Simulates paper on a desk for Mobile */}
        <div className="overflow-x-auto pb-4 -mx-3 px-3 md:mx-0 md:px-0">
            <div className="min-w-[700px] md:w-full mx-auto bg-white shadow-2xl rounded-sm">
                <div id="salary-slip-content" className="p-8 md:p-12 text-slate-900 bg-white relative">
                    
                    {/* Header */}
                    <div className="flex justify-between border-b-2 border-slate-800 pb-6 mb-8">
                        <div className="flex gap-4 items-center">
                            {company.logoUrl && <img src={company.logoUrl} className="h-14 w-14 object-contain grayscale" crossOrigin="anonymous" alt="Logo" />}
                            <div>
                                <h1 className="text-xl font-bold uppercase tracking-wide">{company.name}</h1>
                                <p className="text-slate-500 text-xs mt-1">{site.name}, {site.city}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase mb-2 inline-block tracking-widest">Payslip</div>
                            <div className="text-lg font-bold">{new Date(0, salary.month-1).toLocaleString('default',{month:'short'})} {salary.year}</div>
                        </div>
                    </div>

                    {/* Employee Info */}
                    <div className="bg-slate-50 p-6 border border-slate-100 mb-8 grid grid-cols-3 gap-8">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Employee Name</label>
                            <div className="font-bold text-sm">{user.name}</div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">UAN ID</label>
                            <div className="font-mono text-sm">{user.id}</div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Designation</label>
                            <div className="text-sm">{user.role}</div>
                        </div>
                    </div>

                    {/* Financials */}
                    <div className="grid grid-cols-2 border border-slate-200 mb-8">
                        <div className="border-r border-slate-200">
                            <div className="bg-slate-100 px-4 py-2 text-[10px] font-bold uppercase text-slate-600 tracking-wider border-b border-slate-200">Earnings</div>
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between text-sm"><span>Basic Salary</span><span className="font-medium">{formatINR(salary.basic)}</span></div>
                                <div className="flex justify-between text-sm"><span>HRA</span><span className="font-medium">{formatINR(salary.hra)}</span></div>
                                <div className="flex justify-between text-sm"><span>Allowances</span><span className="font-medium">{formatINR(salary.allowances)}</span></div>
                            </div>
                        </div>
                        <div>
                            <div className="bg-slate-100 px-4 py-2 text-[10px] font-bold uppercase text-slate-600 tracking-wider border-b border-slate-200">Deductions</div>
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between text-sm text-red-600"><span>Provident Fund</span><span>-{formatINR(salary.pfDeduction)}</span></div>
                                <div className="flex justify-between text-sm text-red-600"><span>Professional Tax</span><span>-{formatINR(salary.taxDeduction)}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Net Pay */}
                    <div className="flex justify-end">
                        <div className="bg-slate-900 text-white p-6 w-64 text-right shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <div className="text-[10px] uppercase opacity-60 tracking-widest mb-1">Net Payable</div>
                            <div className="text-2xl font-bold">{formatINR(salary.netSalary)}</div>
                        </div>
                    </div>

                    <div className="text-center text-[10px] text-slate-400 pt-8 mt-8 border-t border-dashed border-slate-200">
                        This is a system generated document from Konark HR System. No signature required.
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-center">
            <Button onClick={handleDownload} isLoading={isDownloading} variant="primary" icon={Download} className="shadow-xl">
                Download PDF Copy
            </Button>
        </div>
    </div>
  );
};