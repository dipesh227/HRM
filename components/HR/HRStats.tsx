import React from 'react';
import { StatCard } from '../UI/StatCard';
import { Users, Clock, Building, Briefcase } from 'lucide-react';

interface HRStatsProps {
  stats: any;
}

export const HRStats: React.FC<HRStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in mb-6">
        <StatCard 
            title="Total Staff" 
            value={stats.totalEmployees || 0} 
            icon={Users} 
            color="blue" 
            subtext="Across all sites"
        />
        <StatCard 
            title="Pending Approvals" 
            value={stats.pendingApprovals || 0} 
            icon={Clock} 
            color="orange" 
            subtext="Action required"
        />
        <StatCard 
            title="Active Sites" 
            value={stats.activeSites || 0} 
            icon={Building} 
            color="green" 
            subtext="Operational"
        />
        <StatCard 
            title="Companies" 
            value={stats.totalCompanies || 0} 
            icon={Briefcase} 
            color="purple" 
            subtext="Client organizations"
        />
    </div>
  );
};