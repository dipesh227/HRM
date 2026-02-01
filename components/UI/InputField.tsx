import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, icon: Icon, error, className = '', ...props 
}) => {
  return (
    <div className={`group ${className}`}>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
            {label}
        </label>
        <div className="relative">
            {Icon && (
                <Icon className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            )}
            <input 
                {...props}
                className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-white dark:bg-slate-800 border ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed`}
            />
        </div>
        {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </div>
  );
};