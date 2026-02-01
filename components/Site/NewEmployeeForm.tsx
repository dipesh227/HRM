import React, { useState } from 'react';
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
}

export const NewEmployeeForm: React.FC<NewEmployeeFormProps> = ({ isOpen, onClose, user, onSuccess, showNotification }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', uan: '', role: EmployeeRole.HELPER });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.companyId || !user.siteId) return;
    setIsSubmitting(true);

    const emp: Employee = {
      name: newEmp.name,
      uan: newEmp.uan,
      role: newEmp.role,
      companyId: user.companyId,
      siteId: user.siteId,
      status: EmployeeStatus.PENDING,
      addedBy: user.id,
      joinedDate: new Date().toISOString().split('T')[0]
    };

    try {
      await dbService.addEmployee(emp);
      onSuccess();
      setNewEmp({ name: '', uan: '', role: EmployeeRole.HELPER });
      onClose();
    } catch (err: any) {
      showNotification('error', err.message || "Failed to add employee.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Employee">
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input 
                required
                type="text" 
                value={newEmp.name}
                onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
            <Button type="submit" variant="primary" isLoading={isSubmitting}>Submit for Approval</Button>
            </div>
        </form>
    </Modal>
  );
};