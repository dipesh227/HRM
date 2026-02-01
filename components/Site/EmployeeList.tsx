import React from 'react';
import { Employee, EmployeeStatus } from '../../types';
import { Badge } from '../UI/Badge';
import { Card } from '../UI/Card';
import { FileText } from 'lucide-react';

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

  return (
    <Card className="p-0">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">Employee Roster</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold">
                <tr>
                    <th className="px-6 py-4">Name / Role</th>
                    <th className="px-6 py-4">UAN</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Documents</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map(emp => (
                    <tr key={emp.uan} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 dark:text-white">{emp.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{emp.role}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">{emp.uan}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{emp.joinedDate}</td>
                    <td className="px-6 py-4">
                        <Badge variant={getStatusVariant(emp.status)}>{emp.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium flex items-center gap-1">
                        <FileText className="w-3 h-3" /> View Docs
                        </button>
                    </td>
                    </tr>
                ))}
                {employees.length === 0 && (
                    <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">No employees found for this site.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    </Card>
  );
};