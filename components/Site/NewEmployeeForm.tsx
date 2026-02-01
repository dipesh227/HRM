import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { Employee, EmployeeRole, EmployeeStatus, User, UserRole } from '../../types';
import { dbService } from '../../services/mockDb';
import { UserPlus, BadgeCheck, User as UserIcon } from 'lucide-react';

interface NewEmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
  showNotification: (type: 'success' | 'error', msg: string) => void;
  overrideSiteId?: string;
  overrideCompanyId?: string;
  defaultRole?: EmployeeRole;
}

export const NewEmployeeForm: React.FC<NewEmployeeFormProps> = ({ 
    isOpen, onClose, user, onSuccess, showNotification, 
    overrideSiteId, overrideCompanyId, defaultRole = EmployeeRole.HELPER 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', uan: '', role: defaultRole });

  useEffect(() => {
      if(isOpen) {
          setNewEmp(prev => ({ ...prev, role: defaultRole }));
      }
  }, [isOpen, defaultRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Logic: If HR is using this (overrideSiteId provided), use that. Else use the logged-in user's site.
    const targetCompanyId = overrideCompanyId || user.companyId;
    const targetSiteId = overrideSiteId || user.siteId;

    if (!targetCompanyId || !targetSiteId) {
        showNotification('error', "System Error: Target Site ID missing. Please ensure a site is selected.");
        return;
    }

    setIsSubmitting(true);

    const emp: Employee = {
      name: newEmp.name,
      uan: newEmp.uan,
      role: newEmp.role,
      companyId: targetCompanyId,
      siteId: targetSiteId,
      status: EmployeeStatus.PENDING, // Default is Pending
      addedBy: user.id,
      joinedDate: new Date().toISOString().split('T')[0]
    };

    try {
      await dbService.addEmployee(emp);
      
      // Automatic Approval logic:
      // 1. If HR creates an employee (or supervisor), auto-approve.
      // 2. If Supervisor creates an employee, it stays pending.
      if (user.role === UserRole.HR) {
          await dbService.approveEmployee(emp.uan, true, user.id);
          showNotification('success', `${emp.role} created and approved.`);
      } else {
          showNotification('success', "Employee added. Waiting for HR approval.");
      }
      
      onSuccess();
      setNewEmp({ name: '', uan: '', role: defaultRole });
      onClose();
    } catch (err: any) {
      showNotification('error', err.message || "Failed to add employee.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // Logic to filter roles based on permissions
  const availableRoles = Object.values(EmployeeRole).filter(r => {
      // HR can add anyone (including Supervisors)
      if (user.role === UserRole.HR) return true;
      
      // Site Incharges cannot add other Supervisors, only staff
      if (user.role === UserRole.SITE_INCHARGE) {
          return r !== EmployeeRole.SUPERVISOR;
      }
      
      return false;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={defaultRole === EmployeeRole.SUPERVISOR ? "Register Site Incharge" : "Add New Employee"}>
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Full Name</label>
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input 
                            required
                            type="text" 
                            value={newEmp.name}
                            onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base"
                            placeholder="e.g. Rajesh Kumar"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">UAN (12-Digit ID)</label>
                    <div className="relative">
                        <BadgeCheck className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input 
                            required
                            type="tel"
                            pattern="\d*"
                            maxLength={12}
                            value={newEmp.uan}
                            onChange={e => setNewEmp({...newEmp, uan: e.target.value})}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-base tracking-widest"
                            placeholder="0000 0000 0000"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">Enter the unique 12-digit identification number.</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Job Role</label>
                    <div className="relative">
                        <select 
                            value={newEmp.role}
                            onChange={e => setNewEmp({...newEmp, role: e.target.value as EmployeeRole})}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-base"
                        >
                            {availableRoles.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-4 w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 pointer-events-none"></div>
                    </div>
                </div>
            </div>
            
            <div className="pt-2 flex gap-3">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} icon={UserPlus} className="flex-1">
                    {user.role === 'HR' ? 'Create' : 'Submit'}
                </Button>
            </div>
        </form>
    </Modal>
  );
};