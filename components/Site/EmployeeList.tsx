import React from 'react';
import { Employee, EmployeeStatus } from '../../types';
import { Badge } from '../UI/Badge';
import { Card } from '../UI/Card';
import { FileText, ChevronRight, UserCircle2 } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ employees }) => {
  const getStatusVariant = (status: EmployeeStatus) => {
      switch(status) {
          case EmployeeStatus.APPROVED: return 'success';
          case EmployeeStatus.PENDING: return 'warning';
          case EmployeeStatus.REJECTED: return 'danger';
          default: return 'neutral';
      }
  };

  if (employees.length === 0) {
      return (
          <Card className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <UserCircle2 className="w-12 h-12 mb-3 opacity-20" />
              <p>No employees found.</p>
          </Card>
      );
  }

  return (
    <Card className="p-0 overflow-hidden" noPadding>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th className="px-6 py-4">Name / Role</th>
                    <th className="px-6 py-4">UAN</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map(emp => (
                    <tr key={emp.uan} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{emp.role}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">{emp.uan}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{emp.joinedDate}</td>
                    <td className="px-6 py-4">
                        <Badge variant={getStatusVariant(emp.status)}>{emp.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button className="text-ios-blue hover:underline text-xs font-medium inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Docs <ChevronRight className="w-3 h-3" />
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>

        {/* Mobile List View (iOS Style) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {employees.map(emp => (
                <div key={emp.uan} className="p-4 flex items-center gap-4 active:bg-slate-50 dark:active:bg-slate-800 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-sm">
                        {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className="font-semibold text-slate-900 dark:text-white truncate">{emp.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">{emp.uan.slice(-4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-slate-500 truncate">{emp.role}</p>
                            <Badge variant={getStatusVariant(emp.status)} className="scale-90 origin-right">{emp.status}</Badge>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
            ))}
        </div>
    </Card>
  );
};