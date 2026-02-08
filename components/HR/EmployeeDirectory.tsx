import React, { useState, useEffect } from 'react';
import { Employee, Site, EmployeeStatus, JobRole } from '../../types';
import { dbService } from '../../services/mockDb';
import { Card } from '../UI/Card';
import { InputField } from '../UI/InputField';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { EmployeeDetailModal } from './EmployeeDetailModal';
import { Search, MapPin, ChevronRight, Building2, Briefcase, Download, Filter } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

interface EmployeeDirectoryProps {
    sites: Site[];
    showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ sites, showNotification }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [roles, setRoles] = useState<JobRole[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [empData, roleData] = await Promise.all([
                dbService.getAllEmployees(),
                dbService.getJobRoles()
            ]);
            setEmployees(empData);
            setRoles(roleData);
        } catch (e) {
            console.error(e);
            showNotification('error', "Failed to load directory data.");
        } finally {
            setLoading(false);
        }
    };

    const filtered = employees.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.uan.includes(search);
        const matchesSite = siteFilter ? e.siteId === siteFilter : true;
        const matchesRole = roleFilter ? e.role === roleFilter : true;
        return matchesSearch && matchesSite && matchesRole;
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

    const handleExport = () => {
        const exportData = filtered.map(emp => ({
            'Full Name': emp.name,
            'UAN': emp.uan,
            'Role': emp.role,
            'Site': getSiteName(emp.siteId),
            'Status': emp.status,
            'Joined Date': emp.joinedDate,
            'Mobile': emp.mobile || 'N/A',
            'Email': emp.personalEmail || 'N/A',
            'Address': emp.address || 'N/A'
        }));

        const ws = utils.json_to_sheet(exportData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Employees");
        
        const timestamp = new Date().toISOString().split('T')[0];
        const siteName = siteFilter ? getSiteName(siteFilter).replace(/\s+/g, '_') : 'All_Sites';
        
        writeFile(wb, `Employee_List_${siteName}_${timestamp}.xlsx`);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Filter Bar */}
            <Card className="p-4 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div className="w-full md:w-auto flex-1">
                        <InputField 
                            label="Search Staff" 
                            placeholder="Search by Name or UAN..." 
                            icon={Search} 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <Button 
                            variant="secondary" 
                            icon={Download} 
                            onClick={handleExport}
                            disabled={filtered.length === 0}
                            className="w-full md:w-auto"
                        >
                            Export to Excel
                        </Button>
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase pl-1">Filter by Site</label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                            <select 
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-ios-blue text-sm appearance-none"
                                value={siteFilter}
                                onChange={e => setSiteFilter(e.target.value)}
                            >
                                <option value="">All Sites (Sectors)</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <Filter className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase pl-1">Filter by Role</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                            <select 
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-ios-blue text-sm appearance-none"
                                value={roleFilter}
                                onChange={e => setRoleFilter(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                {roles.map(r => <option key={r.id} value={r.title}>{r.title}</option>)}
                            </select>
                            <Filter className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Results */}
            <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                     <h3 className="text-sm font-bold text-slate-500 uppercase">
                        Results ({filtered.length})
                    </h3>
                </div>
                
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Loading directory...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p>No employees found matching filters.</p>
                        <button onClick={() => { setSearch(''); setSiteFilter(''); setRoleFilter(''); }} className="text-ios-blue text-sm font-bold mt-2 hover:underline">Clear Filters</button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-ios-dark-card rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filtered.map(emp => (
                                <div 
                                    key={emp.uan} 
                                    onClick={() => setSelectedEmployee(emp)}
                                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group gap-4 sm:gap-0"
                                >
                                    <div className="flex items-start sm:items-center gap-4">
                                        {/* Avatar */}
                                        <div className="relative">
                                            {emp.profilePhotoUrl ? (
                                                <img src={emp.profilePhotoUrl} alt={emp.name} className="h-12 w-12 rounded-full object-cover shadow-sm border border-slate-100 dark:border-slate-700" />
                                            ) : (
                                                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold shadow-inner">
                                                    {emp.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${emp.status === 'APPROVED' ? 'bg-green-500' : emp.status === 'PENDING' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-ios-blue transition-colors truncate">
                                                {emp.name}
                                            </h4>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-slate-500 mt-1">
                                                <span className="font-mono bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{emp.uan}</span>
                                                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {emp.role}</span>
                                                {emp.mobile && <span className="hidden sm:inline-block">| {emp.mobile}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-16 sm:pl-0">
                                        <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg max-w-[140px] truncate">
                                            <MapPin className="w-3 h-3 shrink-0" /> 
                                            <span className="truncate">{getSiteName(emp.siteId)}</span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-ios-blue shrink-0" />
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
                    onClose={() => { setSelectedEmployee(null); loadData(); }} // Reload data on close in case of edits
                    showNotification={showNotification}
                />
            )}
        </div>
    );
};