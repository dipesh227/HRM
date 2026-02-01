import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', isLoading, icon: Icon, className = '', disabled, fullWidth = false, ...props 
}) => {
  const baseStyles = "relative font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const widthClass = fullWidth ? 'w-full' : '';
  const roundedClass = "rounded-xl md:rounded-2xl"; // Squircle-ish
  
  const variants = {
    primary: "bg-ios-blue text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30 border border-transparent",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-transparent hover:bg-slate-200 dark:hover:bg-slate-700",
    danger: "bg-red-50 text-ios-red border border-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30",
    outline: "border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent",
    ghost: "text-ios-blue hover:bg-blue-50 dark:hover:bg-blue-900/20"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs min-h-[32px]",
    md: "px-5 py-2.5 text-sm min-h-[44px]", // 44px is standard iOS touch target
    lg: "px-8 py-3.5 text-base min-h-[52px]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${roundedClass} ${className}`} 
      disabled={isLoading || disabled} 
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4.5 h-4.5" />}
      <span>{children}</span>
    </button>
  );
};