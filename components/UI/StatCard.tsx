import React from 'react';
import { Card } from './Card';
import { LucideIcon } from 'lucide-react';

export type StatColor = 'blue' | 'orange' | 'green' | 'purple' | 'red';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: StatColor;
  subtext?: string;
  className?: string;
}

const colorStyles: Record<StatColor, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtext, className = '' }) => {
    return (
        <Card className={`p-0 border-none shadow-sm hover:shadow-md transition-shadow ${className}`}>
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl ${colorStyles[color]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</h3>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
                {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
            </div>
        </Card>
    );
};