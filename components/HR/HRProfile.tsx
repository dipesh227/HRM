import React, { useState } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { dbService } from '../../services/mockDb';
import { User, UserRole } from '../../types';
import { UserCircle, Lock, Mail, Save, KeyRound } from 'lucide-react';

interface Props {
    showNotification: (type: 'success' | 'error', msg: string) => void;
    user: User; // We need the current user to get the ID
}

export const HRProfile: React.FC<Props> = ({ showNotification, user }) => {
    // We initialize form with current known values, though for security, we don't know the current password
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email || '',
        password: '',
        confirmPassword: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password && formData.password !== formData.confirmPassword) {
            showNotification('error', "New passwords do not match.");
            return;
        }

        setSaving(true);
        try {
            await dbService.updateHRProfile(user.id, {
                name: formData.name,
                email: formData.email,
                password: formData.password // Only sends if not empty
            });
            showNotification('success', "Admin profile updated successfully.");
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (e: any) {
            showNotification('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card title="My Profile Settings" subtitle="Manage your administrator credentials" className="max-w-2xl mx-auto animate-fade-in">
            <form onSubmit={handleSave} className="space-y-6">
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300">
                        <UserCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">Admin Account</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">You are logged in as {user.role}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <InputField 
                        label="Display Name" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        icon={UserCircle}
                        required
                    />
                    <InputField 
                        label="Login Email" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        icon={Mail}
                        type="email"
                        required
                    />
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-slate-400" /> 
                        Change Password
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField 
                            label="New Password" 
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            icon={Lock}
                            type="password"
                            placeholder="Leave blank to keep current"
                        />
                        <InputField 
                            label="Confirm New Password" 
                            value={formData.confirmPassword} 
                            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                            icon={Lock}
                            type="password"
                            placeholder="Confirm new password"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Only enter a value if you wish to change your current password.</p>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button type="submit" variant="primary" icon={Save} isLoading={saving}>Update Profile</Button>
                </div>
            </form>
        </Card>
    );
};