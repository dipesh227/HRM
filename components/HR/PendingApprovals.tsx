import React, { useState } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { dbService } from '../../services/mockDb';
import { Employee } from '../../types';

interface PendingApprovalsProps {
  employees: Employee[];
  onUpdate: () => void;
  showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const PendingApprovals: React.FC<PendingApprovalsProps> = ({ employees, onUpdate, showNotification }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApproval = async (uan: string, approved: boolean) => {
      setProcessingId(uan);
      try {
          await dbService.approveEmployee(uan, approved, 'HR_ADMIN');
          showNotification('success', approved ? "Employee Approved" : "Employee Rejected");
          onUpdate();
      } catch (e: any) {
          showNotification('error', e.message);
      } finally {
          setProcessingId(null);
      }
  };

  if (employees.length === 0) {
      return <div className="text-center py-10 text-slate-500 dark:text-slate-400">No pending approvals found.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
        {employees.map(emp => (
            <Card key={emp.uan} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4">
                <div className="mb-4 md:mb-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-slate-800 dark:text-white">{emp.name}</h4>
                        <Badge variant="warning">Pending</Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">UAN: {emp.uan}</p>
                    <div className="flex gap-3 mt-1 text-xs text-slate-500">
                        <span>Role: <strong>{emp.role}</strong></span>
                        <span>Joined: {emp.joinedDate}</span>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleApproval(emp.uan, false)}
                        isLoading={processingId === emp.uan}
                        disabled={!!processingId}
                        className="flex-1 md:flex-none"
                    >
                        Reject
                    </Button>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleApproval(emp.uan, true)}
                        isLoading={processingId === emp.uan}
                        disabled={!!processingId}
                        className="flex-1 md:flex-none"
                    >
                        Approve
                    </Button>
                </div>
            </Card>
        ))}
    </div>
  );
};