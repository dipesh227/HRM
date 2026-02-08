import React, { useState, useEffect } from 'react';
import { Employee, SalaryView, Company, Site, UserRole } from '../../types';
import { dbService } from '../../services/mockDb';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { AddSalaryForm } from './AddSalaryForm';
import { SalarySlip } from '../Employee/SalarySlip';
import { NewEmployeeForm } from '../Site/NewEmployeeForm'; // Reused for Editing
import { User, Calendar, Trash2, Plus, ChevronLeft, Loader2, Building2, Phone, Mail, MapPin, Pencil, CreditCard, FileText } from 'lucide-react';

interface EmployeeDetailModalProps {
    employee: Employee | null;
    sites: Site[]; 
    onClose: () => void;
    showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ 
    employee, sites, onClose, showNotification 
}) => {
    const [history, setHistory] = useState<{id: string, month: number, year: number}[]>([]);
    const [viewingSalary, setViewingSalary] = useState<SalaryView | null>(null);
    const [isAddingSalary, setIsAddingSalary] = useState(false);
    const [isEditingSalary, setIsEditingSalary] = useState(false); 
    const [isEditingProfile, setIsEditingProfile] = useState(false); // Edit Profile Modal State
    const [loading, setLoading] = useState(false);
    
    // For Payslip Generation
    const [company, setCompany] = useState<Company | undefined>(undefined);
    const [site, setSite] = useState<Site | undefined>(undefined);

    // Refresh employee data if edited
    const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(employee);

    useEffect(() => {
        if (employee) {
            setCurrentEmployee(employee);
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
        if (sal) {
            setViewingSalary(sal);
            setIsEditingSalary(false); 
        }
    };

    if (!currentEmployee) return null;
    const siteName = sites.find(s => s.id === currentEmployee.siteId)?.name || 'Unknown Site';

    // RENDER: PAYSLIP PREVIEW OR EDIT MODE
    if (viewingSalary && company && site) {
        return (
            <Modal isOpen={!!currentEmployee} onClose={() => { setViewingSalary(null); setIsEditingSalary(false); }} title={isEditingSalary ? "Edit Salary Data" : "Payslip Preview"} maxWidth="max-w-4xl">
                <div className="mb-4 flex justify-between items-center">
                    <Button variant="secondary" icon={ChevronLeft} onClick={() => { setViewingSalary(null); setIsEditingSalary(false); }} size="sm">Back to History</Button>
                    
                    {!isEditingSalary && (
                        <Button variant="primary" icon={Pencil} onClick={() => setIsEditingSalary(true)} size="sm">Edit Record</Button>
                    )}
                </div>
                
                {isEditingSalary ? (
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <AddSalaryForm 
                            employeeUan={currentEmployee.uan}
                            siteId={currentEmployee.siteId}
                            initialData={viewingSalary}
                            onSuccess={() => {
                                setIsEditingSalary(false);
                                setViewingSalary(null);
                                showNotification('success', "Salary updated successfully");
                                loadHistory();
                            }}
                            onCancel={() => setIsEditingSalary(false)}
                            showNotification={showNotification}
                        />
                    </div>
                ) : (
                    <SalarySlip 
                        user={{ 
                            id: currentEmployee.uan, 
                            name: currentEmployee.name, 
                            role: UserRole.EMPLOYEE, 
                            identityType: 'UAN', 
                            profilePhotoUrl: currentEmployee.profilePhotoUrl 
                        }} 
                        salary={viewingSalary}
                        company={company}
                        site={site}
                    />
                )}
            </Modal>
        );
    }

    // RENDER: MAIN DETAIL (Profile + History)
    return (
        <>
            <Modal isOpen={!!currentEmployee && !isEditingProfile} onClose={onClose} title="Employee Details" maxWidth="max-w-3xl">
                <div className="space-y-6">
                    
                    {/* 1. Extended Profile Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        {/* Header Banner */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-col md:flex-row gap-6 items-center md:items-start border-b border-slate-100 dark:border-slate-800">
                            {/* Avatar */}
                            <div className="h-24 w-24 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border-4 border-white dark:border-slate-800 shadow-md">
                                {currentEmployee.profilePhotoUrl ? (
                                    <img src={currentEmployee.profilePhotoUrl} alt={currentEmployee.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-slate-400" />
                                )}
                            </div>
                            
                            <div className="flex-1 text-center md:text-left space-y-2">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{currentEmployee.name}</h2>
                                    <p className="text-sm font-bold text-slate-500">{currentEmployee.role}</p>
                                </div>
                                
                                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                    <span className="font-mono text-xs text-slate-500 bg-white dark:bg-black/20 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">UAN: {currentEmployee.uan}</span>
                                    <Badge variant={currentEmployee.status === 'APPROVED' ? 'success' : 'warning'}>{currentEmployee.status}</Badge>
                                </div>
                            </div>

                            <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setIsEditingProfile(true)}>
                                Edit Profile
                            </Button>
                        </div>

                        {/* Personal Details Grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5" /> Work Site
                                </label>
                                <p className="font-medium text-slate-800 dark:text-white">{siteName}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Date of Joining
                                </label>
                                <p className="font-medium text-slate-800 dark:text-white">{currentEmployee.joinedDate}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5" /> Mobile Number
                                </label>
                                <p className="font-medium text-slate-800 dark:text-white">
                                    {currentEmployee.mobile || <span className="text-slate-400 italic">Not Provided</span>}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5" /> Bank Details
                                </label>
                                {currentEmployee.bankAccountNo ? (
                                    <div className="text-sm">
                                        <p className="font-bold text-slate-800 dark:text-white">{currentEmployee.bankName}</p>
                                        <p className="text-slate-500 dark:text-slate-400 font-mono">AC: {currentEmployee.bankAccountNo}</p>
                                        <p className="text-slate-500 dark:text-slate-400 font-mono">IFSC: {currentEmployee.ifscCode}</p>
                                    </div>
                                ) : (
                                    <span className="text-slate-400 italic">Not Provided</span>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> Compliance
                                </label>
                                <div className="text-sm">
                                    <p className="text-slate-800 dark:text-white"><span className="text-slate-500">PF:</span> {currentEmployee.pfNo || 'N/A'}</p>
                                    <p className="text-slate-800 dark:text-white"><span className="text-slate-500">ESIC:</span> {currentEmployee.esicNo || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> Current Address
                                </label>
                                <p className="font-medium text-slate-800 dark:text-white">
                                    {currentEmployee.address || <span className="text-slate-400 italic">Not Provided</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Salary Actions Area */}
                    <div className="pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Salary History</h3>
                            {!isAddingSalary && (
                                <Button size="sm" icon={Plus} onClick={() => setIsAddingSalary(true)}>Add Record</Button>
                            )}
                        </div>

                        {isAddingSalary ? (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm animate-fade-in">
                                <AddSalaryForm 
                                    employeeUan={currentEmployee.uan}
                                    siteId={currentEmployee.siteId}
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
                                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <p className="text-slate-400 text-sm font-medium">No salary records found.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
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
                                                    <Button 
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => handleViewSalary(rec.month, rec.year)}
                                                        className="px-3"
                                                    >
                                                        View / Edit
                                                    </Button>
                                                    <button 
                                                        onClick={() => handleDeleteRecord(rec.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

            {/* Edit Profile Modal */}
            <NewEmployeeForm 
                isOpen={isEditingProfile}
                onClose={() => setIsEditingProfile(false)}
                user={{ id: 'HR_ADMIN', identityType: 'UUID', name: 'HR', role: UserRole.HR }} // Dummy user context for HR edit
                initialData={currentEmployee}
                onSuccess={async () => {
                    const updated = await dbService.getEmployeeByUAN(currentEmployee.uan);
                    if (updated) setCurrentEmployee(updated);
                    showNotification('success', "Profile updated.");
                }}
                showNotification={showNotification}
            />
        </>
    );
};