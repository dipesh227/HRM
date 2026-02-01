import React, { useState } from 'react';
import { SalaryView, Company, Site, User } from '../../types';
import { Button } from '../UI/Button';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface SalarySlipProps {
  user: User;
  salary: SalaryView;
  company: Company;
  site: Site;
}

// --- SUB-COMPONENTS FOR BETTER READABILITY ---

const SlipHeader: React.FC<{ company: Company, site: Site, salary: SalaryView }> = ({ company, site, salary }) => (
    <div className="flex justify-between border-b-2 border-slate-800 pb-6 mb-8">
        <div className="flex gap-4">
            <img src={company.logoUrl} className="h-16 w-16 object-contain" crossOrigin="anonymous" alt="Logo" />
            <div>
                <h1 className="text-2xl font-bold uppercase text-slate-900">{company.name}</h1>
                <p className="text-slate-500 text-sm">{site.name}, {site.city}</p>
            </div>
        </div>
        <div className="text-right">
            <div className="bg-slate-900 text-white px-4 py-1 text-xs font-bold uppercase mb-2 inline-block">Payslip</div>
            <div className="text-lg font-bold text-slate-900">{salary.month}/{salary.year}</div>
        </div>
    </div>
);

const SlipEmployeeDetails: React.FC<{ user: User }> = ({ user }) => (
    <div className="bg-slate-50 p-6 rounded border border-slate-100 mb-8 grid grid-cols-3 gap-4">
        <div><label className="text-[10px] uppercase font-bold text-slate-400">Name</label><div className="font-bold text-slate-900">{user.name}</div></div>
        <div><label className="text-[10px] uppercase font-bold text-slate-400">UAN</label><div className="font-mono text-slate-900">{user.id}</div></div>
        <div><label className="text-[10px] uppercase font-bold text-slate-400">Designation</label><div className="text-slate-900">{user.role}</div></div>
    </div>
);

const SlipFinancials: React.FC<{ salary: SalaryView, formatINR: (n: number) => string }> = ({ salary, formatINR }) => (
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
);

const SlipNetPay: React.FC<{ netSalary: number, formatINR: (n: number) => string }> = ({ netSalary, formatINR }) => (
    <div className="flex justify-end">
        <div className="bg-slate-800 text-white p-6 rounded w-1/3 text-right shadow-lg">
            <div className="text-[10px] uppercase opacity-75">Net Payable</div>
            <div className="text-3xl font-bold">{formatINR(netSalary)}</div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

export const SalarySlip: React.FC<SalarySlipProps> = ({ user, salary, company, site }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

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
        pdf.save(`Payslip_${user.id}_${salary.year}-${salary.month}.pdf`);
    } catch (err) {
        alert("Download failed.");
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="bg-slate-200/50 dark:bg-slate-900/50 p-4 rounded-xl overflow-x-auto animate-fade-in">
        <div className="bg-white shadow-xl mx-auto min-w-[794px] w-[794px]">
            <div id="salary-slip-content" className="p-12 bg-white min-h-[1123px] flex flex-col justify-between text-slate-900">
                <div>
                    <SlipHeader company={company} site={site} salary={salary} />
                    <SlipEmployeeDetails user={user} />
                    <SlipFinancials salary={salary} formatINR={formatINR} />
                    <SlipNetPay netSalary={salary.netSalary} formatINR={formatINR} />
                </div>
                <div className="text-center text-[10px] text-slate-400 pt-6 border-t border-slate-200 mt-8">System Generated Document</div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                <Button onClick={handleDownload} isLoading={isDownloading} variant="primary">
                    Download PDF
                </Button>
            </div>
        </div>
    </div>
  );
};