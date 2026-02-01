import React from 'react';
import { Card } from '../UI/Card';
import { Users, Clock, Building, Briefcase } from 'lucide-react';

interface HRStatsProps {
  stats: any;
}

export const HRStats: React.FC<HRStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in mb-6">
        <StatItem 
            title="Total Staff" 
            value={stats.totalEmployees || 0} 
            icon={Users} 
            color="blue" 
            subtext="Across all sites"
        />
        <StatItem 
            title="Pending Approvals" 
            value={stats.pendingApprovals || 0} 
            icon={Clock} 
            color="orange" 
            subtext="Action required"
        />
        <StatItem 
            title="Active Sites" 
            value={stats.activeSites || 0} 
            icon={Building} 
            color="green" 
            subtext="Operational"
        />
        <StatItem 
            title="Companies" 
            value={stats.totalCompanies || 0} 
            icon={Briefcase} 
            color="purple" 
            subtext="Client organizations"
        />
    </div>
  );
};

const StatItem = ({ title, value, icon: Icon, color, subtext }: any) => {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    };

    return (
        <Card className="p-0 border-none shadow-sm hover:shadow-md transition-shadow">
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl ${(colorStyles as any)[color]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        24h
                    </span>
                </div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
                <p className="text-xs text-slate-400 mt-2">{subtext}</p>
            </div>
        </Card>
    );
}