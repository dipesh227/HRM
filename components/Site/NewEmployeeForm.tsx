import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { Employee, EmployeeRole, EmployeeStatus, User } from '../../types';
import { dbService } from '../../services/mockDb';

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

  // Reset form when opened or role changes
  useEffect(() => {
      if(isOpen) {
          setNewEmp(prev => ({ ...prev, role: defaultRole }));
      }
  }, [isOpen, defaultRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine target Site/Company: Use overrides if present (HR Mode), else User's own (Manager Mode)
    const targetCompanyId = overrideCompanyId || user.companyId;
    const targetSiteId = overrideSiteId || user.siteId;

    if (!targetCompanyId || !targetSiteId) {
        showNotification('error', "Target Site configuration missing.");
        return;
    }

    setIsSubmitting(true);

    const emp: Employee = {
      name: newEmp.name,
      uan: newEmp.uan,
      role: newEmp.role,
      companyId: targetCompanyId,
      siteId: targetSiteId,
      status: EmployeeStatus.PENDING,
      addedBy: user.id,
      joinedDate: new Date().toISOString().split('T')[0]
    };

    try {
      await dbService.addEmployee(emp);
      
      // Auto-approve if HR is adding
      if (user.role === 'HR') {
          await dbService.approveEmployee(emp.uan, true, user.id);
          showNotification('success', "Site Incharge created and approved successfully.");
      } else {
          showNotification('success', "Employee added. Waiting for approval.");
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={defaultRole === EmployeeRole.SUPERVISOR ? "Create New Site Incharge" : "Add New Employee"}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input 
                required
                type="text" 
                value={newEmp.name}
                onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Rahul Sharma"
            />
            </div>
            <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">UAN (Unique ID)</label>
                <input 
                required
                type="text" 
                value={newEmp.uan}
                onChange={e => setNewEmp({...newEmp, uan: e.target.value})}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="12-digit ID"
                maxLength={12}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select 
                value={newEmp.role}
                onChange={e => setNewEmp({...newEmp, role: e.target.value as EmployeeRole})}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                {Object.values(EmployeeRole).map(r => (
                    <option key={r} value={r}>{r}</option>
                ))}
                </select>
            </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
                {user.role === 'HR' ? 'Create & Approve' : 'Submit for Approval'}
            </Button>
            </div>
        </form>
    </Modal>
  );
};