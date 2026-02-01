import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { dbService } from '../../services/mockDb';
import { JobRole } from '../../types';
import { Briefcase, Plus, Trash2, Shield, Loader2 } from 'lucide-react';

interface Props {
  showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const JobRoleManagement: React.FC<Props> = ({ showNotification }) => {
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await dbService.getJobRoles();
      setRoles(data);
    } catch (e) {
      console.error(e);
      showNotification('error', "Failed to load job roles.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleTitle.trim()) return;
    
    setIsAdding(true);
    try {
      await dbService.addJobRole(newRoleTitle.trim(), newRoleDesc.trim());
      showNotification('success', "Job role added successfully.");
      setNewRoleTitle('');
      setNewRoleDesc('');
      loadRoles();
    } catch (e: any) {
      showNotification('error', e.message || "Failed to add role.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Are you sure you want to delete this job role?")) return;
    try {
      await dbService.deleteJobRole(id);
      showNotification('success', "Job role deleted.");
      loadRoles();
    } catch (e: any) {
      showNotification('error', e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Add New Role Form */}
            <Card title="Add New Role" className="md:col-span-1 h-fit">
                <form onSubmit={handleAdd} className="space-y-4">
                    <InputField 
                        label="Role Title" 
                        value={newRoleTitle} 
                        onChange={e => setNewRoleTitle(e.target.value)} 
                        placeholder="e.g. Mason"
                        icon={Briefcase}
                        required
                    />
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase pl-1">Description (Optional)</label>
                        <textarea 
                            value={newRoleDesc}
                            onChange={e => setNewRoleDesc(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                            placeholder="Brief description of responsibilities..."
                        />
                    </div>
                    <Button type="submit" variant="primary" fullWidth icon={Plus} isLoading={isAdding}>
                        Create Role
                    </Button>
                </form>
            </Card>

            {/* Role List */}
            <Card title={`Existing Roles (${roles.length})`} className="md:col-span-2">
                {loading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {roles.map(role => (
                            <div key={role.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center group hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-800 dark:text-white">{role.title}</h4>
                                        {role.isSystemDefault && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1" title="System Default - Cannot Delete">
                                                <Shield className="w-3 h-3" /> System
                                            </span>
                                        )}
                                    </div>
                                    {role.description && <p className="text-sm text-slate-500 mt-1">{role.description}</p>}
                                </div>
                                {!role.isSystemDefault && (
                                    <button 
                                        onClick={() => handleDelete(role.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Role"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {roles.length === 0 && <p className="text-center py-8 text-slate-400">No roles defined.</p>}
                    </div>
                )}
            </Card>
        </div>
    </div>
  );
};