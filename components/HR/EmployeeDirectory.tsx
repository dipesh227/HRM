import React, { useState, useEffect } from 'react';
import { Employee, Site, EmployeeStatus } from '../../types';
import { dbService } from '../../services/mockDb';
import { Card } from '../UI/Card';
import { InputField } from '../UI/InputField';
import { Badge } from '../UI/Badge';
import { EmployeeDetailModal } from './EmployeeDetailModal';
import { Search, MapPin, User, ChevronRight, Filter, Building2 } from 'lucide-react';

interface EmployeeDirectoryProps {
    sites: Site[];
    showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ sites, showNotification }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const data = await dbService.getAllEmployees();
            setEmployees(data);
        } catch (e) {
            console.error(e);
            showNotification('error', "Failed to load staff list.");
        } finally {
            setLoading(false);
        }
    };

    const filtered = employees.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.uan.includes(search);
        const matchesSite = siteFilter ? e.siteId === siteFilter : true;
        return matchesSearch && matchesSite;
    });

    const getStatusVariant = (status: EmployeeStatus) => {
        switch(status) {
            case EmployeeStatus.APPROVED: return 'success';
            case EmployeeStatus.PENDING: return 'warning';
            case EmployeeStatus.REJECTED: return 'danger';
            default: return 'neutral';
        }
    };

    const getSiteName = (id: string) => sites.find(s => s.id === id)?.name || 'Unknown Site';

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Filter Bar */}
            <Card className="p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <InputField 
                        label="Search Staff" 
                        placeholder="Search by Name or UAN..." 
                        icon={Search} 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>
                <div className="w-full md:w-64">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase pl-1">Filter by Site</label>
                    <div className="relative">
                        <Building2 className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                        <select 
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-ios-blue text-sm appearance-none"
                            value={siteFilter}
                            onChange={e => setSiteFilter(e.target.value)}
                        >
                            <option value="">All Sites</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Results */}
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase px-2">
                    Results ({filtered.length})
                </h3>
                
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Loading directory...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        No employees found matching filters.
                    </div>
                ) : (
                    <div className="bg-white dark:bg-ios-dark-card rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filtered.map(emp => (
                                <div 
                                    key={emp.uan} 
                                    onClick={() => setSelectedEmployee(emp)}
                                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold shadow-inner">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-ios-blue transition-colors">
                                                {emp.name}
                                            </h4>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-slate-500 mt-0.5">
                                                <span className="font-mono">{emp.uan}</span>
                                                <span className="hidden sm:inline text-slate-300">•</span>
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {getSiteName(emp.siteId)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={getStatusVariant(emp.status)} className="hidden sm:inline-flex">{emp.status}</Badge>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-ios-blue" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {selectedEmployee && (
                <EmployeeDetailModal 
                    employee={selectedEmployee}
                    sites={sites}
                    onClose={() => setSelectedEmployee(null)}
                    showNotification={showNotification}
                />
            )}
        </div>
    );
};