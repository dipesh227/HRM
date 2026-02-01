import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { dbService } from '../../services/mockDb';
import { User, Employee } from '../../types';
import { UserCircle, MapPin, Calendar, Briefcase, BadgeCheck, Building2, Loader2 } from 'lucide-react';

interface Props {
    user: User;
}

export const StaffProfile: React.FC<Props> = ({ user }) => {
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // Fetch full details using UAN (user.id is UAN for staff)
                const data = await dbService.getEmployeeByUAN(user.id);
                setEmployee(data || null);
            } catch (e) {
                console.error("Failed to load profile", e);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [user.id]);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>;
    if (!employee) return <div className="text-center p-8 text-slate-500">Profile not found.</div>;

    return (
        <Card title="My Profile" subtitle="Your registered employment details" className="max-w-2xl mx-auto animate-fade-in">
            <div className="space-y-6">
                
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                    <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/20">
                        {employee.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{employee.name}</h2>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                            <Badge variant="info">{employee.role}</Badge>
                            <Badge variant={employee.status === 'APPROVED' ? 'success' : 'warning'}>{employee.status}</Badge>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                            <BadgeCheck className="w-3.5 h-3.5" /> UAN (ID)
                        </label>
                        <p className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200 tracking-wider">{employee.uan}</p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> Designation
                        </label>
                        <p className="font-medium text-lg text-slate-800 dark:text-slate-200">{employee.role}</p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Date of Joining
                        </label>
                        <p className="font-medium text-lg text-slate-800 dark:text-slate-200">{employee.joinedDate}</p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" /> Company ID
                        </label>
                        <p className="font-mono text-sm text-slate-600 dark:text-slate-400 truncate" title={employee.companyId}>{employee.companyId}</p>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Site Assignment</h4>
                        <p className="text-blue-700 dark:text-blue-300 text-sm mt-0.5">
                            You are currently assigned to Site ID: <span className="font-mono font-bold">{employee.siteId}</span>.
                            Please contact HR for transfer requests.
                        </p>
                    </div>
                </div>

            </div>
        </Card>
    );
};