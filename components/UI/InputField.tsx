import React from 'react';
import { type LucideIcon } from 'lucide-react';

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
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide group-focus-within:text-ios-blue dark:group-focus-within:text-blue-400 transition-colors pl-1">
            {label}
        </label>
        <div className="relative transition-transform duration-200 group-focus-within:scale-[1.01]">
            {Icon && (
                <Icon className="absolute left-4 top-4 h-5 w-5 text-slate-400 group-focus-within:text-ios-blue transition-colors" />
            )}
            <input 
                {...props}
                className={`w-full ${Icon ? 'pl-12' : 'pl-5'} pr-5 py-3.5 md:py-4 bg-slate-50 dark:bg-slate-800/50 border ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700/50'} text-slate-900 dark:text-white rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-ios-blue outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium shadow-sm`}
            />
        </div>
        {error && <p className="text-red-500 text-xs font-medium mt-1.5 ml-1 flex items-center gap-1 animate-slide-up">
           <span className="w-1 h-1 rounded-full bg-red-500"></span> {error}
        </p>}
    </div>
  );
};