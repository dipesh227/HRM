import React, { useState, useEffect } from 'react';
import { Employee, SalaryView, Company, Site, UserRole } from '../../types';
import { dbService } from '../../services/mockDb';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { AddSalaryForm } from './AddSalaryForm';
import { SalarySlip } from '../Employee/SalarySlip';
import { User, Calendar, Trash2, Eye, Plus, ChevronLeft, Loader2, Building2 } from 'lucide-react';

interface EmployeeDetailModalProps {
    employee: Employee | null;
    sites: Site[]; // Passed to map IDs to names
    onClose: () => void;
    showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ 
    employee, sites, onClose, showNotification 
}) => {
    const [history, setHistory] = useState<{id: string, month: number, year: number}[]>([]);
    const [viewingSalary, setViewingSalary] = useState<SalaryView | null>(null);
    const [isAddingSalary, setIsAddingSalary] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // For Payslip Generation
    const [company, setCompany] = useState<Company | undefined>(undefined);
    const [site, setSite] = useState<Site | undefined>(undefined);

    useEffect(() => {
        if (employee) {
            loadHistory();
            loadContext();
        }
    }, [employee]);

    const loadHistory = async () => {
        if (!employee) return;
        setLoading(true);
        const data = await dbService.getEmployeeSalaryHistory(employee.uan);
        setHistory(data);
        setLoading(false);
    };

    const loadContext = async () => {
        if(!employee) return;
        const c = await dbService.getCompanyDetails(employee.companyId);
        const s = await dbService.getSiteDetails(employee.siteId);
        setCompany(c);
        setSite(s);
    };

    const handleDeleteRecord = async (recordId: string) => {
        if (!window.confirm("Are you sure you want to delete this salary record?")) return;
        try {
            await dbService.deleteSalaryRecord(recordId, 'HR_ADMIN');
            showNotification('success', "Salary record deleted.");
            loadHistory();
        } catch (e: any) {
            showNotification('error', e.message);
        }
    };

    const handleViewSalary = async (month: number, year: number) => {
        if (!employee) return;
        const sal = await dbService.getEmployeeSalaryView(employee.uan, month, year);
        if (sal) setViewingSalary(sal);
    };

    if (!employee) return null;
    const siteName = sites.find(s => s.id === employee.siteId)?.name || 'Unknown Site';

    // RENDER: PAYSLIP PREVIEW
    if (viewingSalary && company && site) {
        return (
            <Modal isOpen={!!employee} onClose={() => setViewingSalary(null)} title="Payslip Preview" maxWidth="max-w-4xl">
                <div className="mb-4">
                    <Button variant="secondary" icon={ChevronLeft} onClick={() => setViewingSalary(null)} size="sm">Back to History</Button>
                </div>
                <SalarySlip 
                    user={{ id: employee.uan, name: employee.name, role: UserRole.EMPLOYEE, identityType: 'UAN' }} // Mock User obj for component
                    salary={viewingSalary}
                    company={company}
                    site={site}
                />
            </Modal>
        );
    }

    // RENDER: MAIN DETAIL
    return (
        <Modal isOpen={!!employee} onClose={onClose} title="Employee Details" maxWidth="max-w-2xl">
            <div className="space-y-6">
                
                {/* Header Profile */}
                <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/30">
                        {employee.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{employee.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="font-mono text-sm text-slate-500 bg-white dark:bg-black/20 px-1.5 rounded border border-slate-200 dark:border-slate-700">{employee.uan}</span>
                             <Badge variant={employee.status === 'APPROVED' ? 'success' : 'warning'}>{employee.status}</Badge>
                        </div>
                        <div className="mt-3 flex gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {employee.role}</span>
                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {siteName}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined: {employee.joinedDate}</span>
                        </div>
                    </div>
                </div>

                {/* Actions Area */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Salary History</h3>
                        {!isAddingSalary && (
                            <Button size="sm" icon={Plus} onClick={() => setIsAddingSalary(true)}>Add Record</Button>
                        )}
                    </div>

                    {isAddingSalary ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm">
                            <AddSalaryForm 
                                employeeUan={employee.uan}
                                siteId={employee.siteId}
                                onSuccess={() => { setIsAddingSalary(false); loadHistory(); }}
                                onCancel={() => setIsAddingSalary(false)}
                                showNotification={showNotification}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
                            ) : history.length === 0 ? (
                                <p className="text-center py-8 text-slate-400 text-sm">No salary records found for this employee.</p>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                                    {history.map(rec => (
                                        <div key={`${rec.month}-${rec.year}`} className="p-3 md:p-4 flex justify-between items-center bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                    {new Date(0, rec.month-1).toLocaleString('default', {month:'short'})}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white">{new Date(0, rec.month-1).toLocaleString('default', {month:'long'})}, {rec.year}</p>
                                                    <p className="text-[10px] text-slate-400">ID: {rec.id?.slice(0,8)}...</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleViewSalary(rec.month, rec.year)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Payslip"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteRecord(rec.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};