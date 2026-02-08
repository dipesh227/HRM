import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { SalaryRecord, SalaryView } from '../../types';
import { dbService } from '../../services/mockDb';
import { IndianRupee, Save, Lock } from 'lucide-react';

interface AddSalaryFormProps {
    employeeUan: string;
    siteId: string;
    onSuccess: () => void;
    onCancel: () => void;
    showNotification: (type: 'success' | 'error', msg: string) => void;
    initialData?: SalaryView; // Optional: If provided, form is in EDIT mode
}

export const AddSalaryForm: React.FC<AddSalaryFormProps> = ({ 
    employeeUan, siteId, onSuccess, onCancel, showNotification, initialData 
}) => {
    const today = new Date();
    
    // Initialize state. If initialData exists, use it. Otherwise default to today.
    const [formData, setFormData] = useState({
        month: initialData ? initialData.month : today.getMonth() + 1,
        year: initialData ? initialData.year : today.getFullYear(),
        basic: initialData ? initialData.basic : 0,
        hra: initialData ? initialData.hra : 0,
        allowances: initialData ? initialData.allowances : 0,
        pfDeduction: initialData ? initialData.pfDeduction : 0,
        taxDeduction: initialData ? initialData.taxDeduction : 0
    });
    
    const [loading, setLoading] = useState(false);
    const isEditing = !!initialData; // Derived state

    const netSalary = formData.basic + formData.hra + formData.allowances - formData.pfDeduction - formData.taxDeduction;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const record: SalaryRecord = {
                id: initialData?.id || '', // Maintain ID if editing
                employeeUan,
                siteId,
                month: formData.month,
                year: formData.year,
                basic: formData.basic,
                hra: formData.hra,
                allowances: formData.allowances,
                pfDeduction: formData.pfDeduction,
                taxDeduction: formData.taxDeduction,
                netSalary: 0, // DB handles calc
                isLocked: true
            };

            await dbService.upsertSingleSalary(record, 'HR_ADMIN');
            showNotification('success', isEditing ? "Salary record updated." : "New salary record created.");
            onSuccess();
        } catch (e: any) {
            showNotification('error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-slate-700 dark:text-white uppercase tracking-wide">
                    {isEditing ? 'Edit Earnings & Deductions' : 'Create New Salary Record'}
                </h4>
                {isEditing && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">Editing Mode</span>}
            </div>

            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Month</label>
                    <select 
                        value={formData.month} 
                        onChange={e => setFormData({...formData, month: parseInt(e.target.value)})}
                        className={`w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                        disabled={isEditing}
                    >
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m-1).toLocaleString('default', {month:'long'})}</option>
                        ))}
                    </select>
                    {isEditing && <Lock className="absolute right-8 top-9 w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 relative">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Year</label>
                    <select 
                        value={formData.year} 
                        onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                        className={`w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                        disabled={isEditing}
                    >
                        {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {isEditing && <Lock className="absolute right-8 top-9 w-4 h-4 text-slate-400" />}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <InputField 
                    label="Basic Salary" 
                    type="number" 
                    value={formData.basic} 
                    onChange={e => setFormData({...formData, basic: parseFloat(e.target.value) || 0})} 
                    icon={IndianRupee}
                />
                <InputField 
                    label="HRA" 
                    type="number" 
                    value={formData.hra} 
                    onChange={e => setFormData({...formData, hra: parseFloat(e.target.value) || 0})} 
                    icon={IndianRupee}
                />
                <InputField 
                    label="Allowances" 
                    type="number" 
                    value={formData.allowances} 
                    onChange={e => setFormData({...formData, allowances: parseFloat(e.target.value) || 0})} 
                    icon={IndianRupee}
                />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                <InputField 
                    label="PF Deduction" 
                    type="number" 
                    value={formData.pfDeduction} 
                    onChange={e => setFormData({...formData, pfDeduction: parseFloat(e.target.value) || 0})} 
                    icon={IndianRupee}
                    className="text-red-500"
                />
                <InputField 
                    label="Tax / Other" 
                    type="number" 
                    value={formData.taxDeduction} 
                    onChange={e => setFormData({...formData, taxDeduction: parseFloat(e.target.value) || 0})} 
                    icon={IndianRupee}
                    className="text-red-500"
                />
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
                <span className="text-xs uppercase font-bold tracking-wider">Net Payable</span>
                <span className="text-xl font-bold">₹ {netSalary.toLocaleString()}</span>
            </div>

            <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
                <Button type="submit" variant="primary" icon={Save} isLoading={loading} className="flex-1">{isEditing ? 'Update' : 'Save'}</Button>
            </div>
        </form>
    );
};