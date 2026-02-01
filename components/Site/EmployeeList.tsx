import React from 'react';
import { Employee, EmployeeStatus } from '../../types';
import { Badge } from '../UI/Badge';
import { Card } from '../UI/Card';
import { UserCircle2 } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ employees }) => {
  const getStatusVariant = (status: EmployeeStatus) => {
      switch(status) {
          case EmployeeStatus.APPROVED: return 'success';
          case EmployeeStatus.PENDING: return 'warning';
          case EmployeeStatus.REJECTED: return 'danger';
          case EmployeeStatus.INACTIVE: return 'neutral';
          default: return 'neutral';
      }
  };

  if (employees.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <UserCircle2 className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No employees registered yet.</p>
          </div>
      );
  }

  return (
    <Card className="p-0 overflow-hidden shadow-sm" noPadding>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th className="px-6 py-4">Name / Role</th>
                    <th className="px-6 py-4">UAN</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4">Status</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map(emp => (
                    <tr key={emp.uan} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{emp.role}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">{emp.uan}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{emp.joinedDate}</td>
                    <td className="px-6 py-4">
                        <Badge variant={getStatusVariant(emp.status)}>{emp.status}</Badge>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>

        {/* Mobile List View (iOS Style) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {employees.map(emp => (
                <div key={emp.uan} className="p-4 flex items-center gap-3.5 active:bg-slate-50 dark:active:bg-slate-800 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm shadow-inner shrink-0">
                        {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate pr-2">{emp.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-white/5 px-1.5 py-0.5 rounded ml-auto shrink-0">{emp.uan.slice(-4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-slate-500 font-medium">{emp.role}</p>
                            <Badge variant={getStatusVariant(emp.status)} className="scale-[0.85] origin-right shadow-none">{emp.status}</Badge>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </Card>
  );
};